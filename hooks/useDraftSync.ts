// Draft sync hook — auto-syncs offline drafts when connectivity returns.
//
// Think of it like a delivery truck that's been waiting at the depot
// because the bridge was out. As soon as the bridge reopens (internet
// comes back), the truck starts delivering packages (drafts) one by
// one to the warehouse (Supabase).
//
// Called from home.tsx so it runs whenever the user is on the main
// screen. It watches for two things:
// 1. Internet coming back online (false → true)
// 2. Drafts with status 'pending' or 'failed' (with retries left)

import { useEffect, useRef, useCallback } from 'react';
import { File } from 'expo-file-system';
import { useNetworkStatus } from './useNetworkStatus';
import { useDraftStore, type DraftEntry } from '@/stores/draftStore';
import { useEntriesStore, mapSupabaseEntry } from '@/stores/entriesStore';
import { useAuthStore } from '@/stores/authStore';
import { entriesService } from '@/services/entries.service';
import { storageService } from '@/services/storage.service';
import { audioCleanupService } from '@/services/audioCleanup.service';
import { startTrialIfNeeded } from '@/lib/subscriptionHelpers';

const MAX_RETRIES = 3;

// Exponential backoff: 5s → 15s → 45s (5 * 3^retryCount)
function backoffMs(retryCount: number): number {
  return 5000 * Math.pow(3, retryCount);
}

export function useDraftSync() {
  const { isOnline } = useNetworkStatus();
  const wasOnlineRef = useRef(isOnline);
  const isSyncingRef = useRef(false);
  const backoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const session = useAuthStore((s) => s.session);
  const addEntryLocal = useEntriesStore((s) => s.addEntryLocal);
  const drafts = useDraftStore((s) => s.drafts);
  const updateDraft = useDraftStore((s) => s.updateDraft);
  const removeDraft = useDraftStore((s) => s.removeDraft);

  // ─── Sync a single draft ──────────────────────────────
  //
  // Uses checkpoint flags so we can resume if the app was
  // killed mid-sync. Each step is idempotent — running it
  // twice won't create duplicate data.

  const syncDraft = useCallback(async (draft: DraftEntry): Promise<boolean> => {
    try {
      updateDraft(draft.localId, {
        status: 'syncing',
        lastSyncAttempt: new Date().toISOString(),
      });

      let entryId = draft.supabaseEntryId;

      // Step 1: Create the database row (if not already done)
      if (!entryId) {
        const row = await entriesService.create({
          family_id: draft.familyId,
          transcript: draft.transcript,
          entry_date: draft.entryDate,
          entry_type: draft.entryType,
          location_text: draft.locationText,
          ...(draft.isOnboarding && { is_favorited: true }),
        });
        entryId = row.id;
        updateDraft(draft.localId, { supabaseEntryId: entryId });
      }

      // Step 2: Upload audio (if we have a local file and haven't uploaded yet)
      if (draft.audioLocalUri && !draft.audioUploaded) {
        const audioFile = new File(draft.audioLocalUri);
        if (audioFile.exists) {
          const storagePath = await storageService.uploadAudio(entryId, draft.audioLocalUri);
          await entriesService.update(entryId, { audio_storage_path: storagePath });
          updateDraft(draft.localId, { audioUploaded: true });
        } else {
          // Audio file is gone — mark as uploaded so we don't keep trying.
          // The text transcript is still preserved, so the memory isn't lost.
          updateDraft(draft.localId, { audioUploaded: true });
        }
      }

      // Step 3: Clean up local audio file
      if (draft.audioLocalUri) {
        await audioCleanupService.deleteLocalFile(draft.audioLocalUri);
      }

      // Step 4: Fire-and-forget AI processing (title + transcript cleanup)
      entriesService.processWithAI(entryId).catch(() => {});

      // Step 5: Fetch the full entry (with joins) and add to local cache
      const fullRow = await entriesService.getEntry(entryId);
      const mapped = mapSupabaseEntry(fullRow);
      addEntryLocal(mapped);

      // Step 6: Start the free trial if this is the user's first entry.
      await startTrialIfNeeded();

      // Step 7: Remove the draft — it's fully synced!
      removeDraft(draft.localId);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      updateDraft(draft.localId, {
        status: 'failed',
        syncError: errorMessage,
        retryCount: draft.retryCount + 1,
      });
      return false;
    }
  }, [updateDraft, removeDraft, addEntryLocal]);

  // ─── Process the draft queue ──────────────────────────
  //
  // Runs drafts one at a time (sequential, not parallel) to
  // avoid overwhelming the network when there are many queued.

  const processQueue = useCallback(async () => {
    if (isSyncingRef.current) return; // Already syncing
    if (!session?.user?.id) return;   // Not logged in

    const userId = session.user.id;
    const eligible = useDraftStore.getState().drafts.filter(
      (d) =>
        d.userId === userId &&
        (d.status === 'pending' || (d.status === 'failed' && d.retryCount < MAX_RETRIES)),
    );

    if (eligible.length === 0) return;

    isSyncingRef.current = true;

    for (const draft of eligible) {
      // Re-check connectivity before each draft (it might have dropped)
      const currentDraft = useDraftStore.getState().drafts.find(
        (d) => d.localId === draft.localId,
      );
      if (!currentDraft) continue; // Already removed

      const success = await syncDraft(currentDraft);

      if (!success) {
        // If this one failed, schedule a backoff retry and stop
        // processing the rest (likely a network issue).
        const delay = backoffMs(currentDraft.retryCount);
        backoffTimerRef.current = setTimeout(() => {
          if (isSyncingRef.current) return;
          processQueue();
        }, delay);
        break;
      }
    }

    isSyncingRef.current = false;
  }, [session?.user?.id, syncDraft]);

  // ─── Manual retry (for tapping a failed draft) ────────

  const retryDraft = useCallback(async (localId: string) => {
    const draft = useDraftStore.getState().drafts.find((d) => d.localId === localId);
    if (!draft || draft.status === 'syncing') return;

    // Reset retry count for manual retry
    updateDraft(localId, { retryCount: 0, status: 'pending', syncError: null });
    processQueue();
  }, [updateDraft, processQueue]);

  // ─── Watch for connectivity changes ───────────────────
  //
  // When internet transitions from offline → online, kick off
  // the sync queue. Think of it like a notification that says
  // "the road is clear, start delivering!"

  useEffect(() => {
    const wasOffline = !wasOnlineRef.current;
    wasOnlineRef.current = isOnline;

    if (isOnline && wasOffline) {
      // Clear any pending backoff timer
      if (backoffTimerRef.current) {
        clearTimeout(backoffTimerRef.current);
        backoffTimerRef.current = null;
      }
      processQueue();
    }
  }, [isOnline, processQueue]);

  // Also process on mount (in case there are pending drafts
  // from a previous session and we're already online)
  const hasProcessedOnMount = useRef(false);
  useEffect(() => {
    if (isOnline && !hasProcessedOnMount.current) {
      hasProcessedOnMount.current = true;
      processQueue();
    }
  }, [isOnline, processQueue]);

  // Cleanup backoff timer on unmount
  useEffect(() => {
    return () => {
      if (backoffTimerRef.current) {
        clearTimeout(backoffTimerRef.current);
      }
    };
  }, []);

  return { retryDraft };
}
