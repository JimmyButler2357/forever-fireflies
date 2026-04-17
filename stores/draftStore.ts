// Draft store — offline queue for entries that couldn't sync to Supabase.
//
// Think of it like a "outbox" for your memories. When you're offline,
// entries go into the outbox. When you're back online, they get sent
// one by one to Supabase (like a mailbox being emptied by the postman).
//
// Persisted via AsyncStorage so drafts survive app restarts.
// Each draft is namespaced by userId so different accounts on the
// same device never see each other's drafts.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────

export type DraftStatus = 'pending' | 'syncing' | 'failed';

export interface DraftEntry {
  localId: string;               // Unique ID like "draft_1678901234567_abc123"
  userId: string;                // Owner — from session at creation time

  // Content (mirrors what entriesService.create() needs)
  transcript: string;
  audioLocalUri: string | null;  // Points to documentDirectory (persistent)
  entryDate: string;             // ISO date string
  entryType: 'voice' | 'text';
  locationText: string | null;
  familyId: string;
  isOnboarding: boolean;
  photoLocalUris: string[];

  // Sync state
  status: DraftStatus;
  createdAt: string;             // When the draft was saved locally
  lastSyncAttempt: string | null;
  syncError: string | null;
  retryCount: number;

  // Checkpoint flags — let us resume from where we left off
  // if the app gets killed mid-sync. Think of them like
  // checkpoints in a video game — you don't restart from
  // the beginning if you die, you pick up from the last save.
  supabaseEntryId: string | null;  // Set after DB row created
  audioUploaded: boolean;           // Set after storage upload
}

// ─── ID Generator ────────────────────────────────────────

function draftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Input Type ──────────────────────────────────────────
// Pick is safer than Omit here — explicitly lists what the
// caller provides, so adding new internal fields to DraftEntry
// doesn't require updating this type.

export type DraftInput = Pick<DraftEntry,
  'userId' | 'transcript' | 'audioLocalUri' | 'entryDate' |
  'entryType' | 'locationText' | 'familyId' | 'isOnboarding'
> & {
  photoLocalUris?: string[];
};

// ─── Store ───────────────────────────────────────────────

interface DraftState {
  drafts: DraftEntry[];

  /** Save a new draft to the outbox. */
  addDraft: (draft: DraftInput) => string;

  /** Partially update a draft by localId. */
  updateDraft: (localId: string, updates: Partial<DraftEntry>) => void;

  /** Remove a draft after successful sync. */
  removeDraft: (localId: string) => void;

  /** Get all drafts belonging to a specific user. */
  getDraftsForUser: (userId: string) => DraftEntry[];

  /** On app startup, reset any drafts stuck in 'syncing' back to 'failed'.
   *  This handles the case where the app was killed mid-sync — those drafts
   *  never got a chance to finish, so we treat them as failed so the sync
   *  engine picks them back up. */
  resetStaleSyncing: () => void;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      drafts: [],

      addDraft: (draft) => {
        const localId = draftId();
        const newDraft: DraftEntry = {
          ...draft,
          localId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          lastSyncAttempt: null,
          syncError: null,
          retryCount: 0,
          supabaseEntryId: null,
          audioUploaded: false,
          photoLocalUris: draft.photoLocalUris ?? [],
        };
        set((state) => ({
          drafts: [newDraft, ...state.drafts],
        }));
        return localId;
      },

      updateDraft: (localId, updates) =>
        set((state) => ({
          drafts: state.drafts.map((d) =>
            d.localId === localId ? { ...d, ...updates } : d,
          ),
        })),

      removeDraft: (localId) =>
        set((state) => ({
          drafts: state.drafts.filter((d) => d.localId !== localId),
        })),

      getDraftsForUser: (userId) =>
        get().drafts.filter((d) => d.userId === userId),

      resetStaleSyncing: () => {
        // Only update if there are actually stale drafts — avoids
        // triggering subscribers and an AsyncStorage write on every
        // app startup when there's nothing to reset.
        if (!get().drafts.some((d) => d.status === 'syncing')) return;
        set((state) => ({
          drafts: state.drafts.map((d) =>
            d.status === 'syncing'
              ? { ...d, status: 'failed' as const, syncError: 'App was closed during sync' }
              : d,
          ),
        }));
      },
    }),
    {
      name: 'draft-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
