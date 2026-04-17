import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
  ActivityIndicator,
  GestureResponderEvent,
  Keyboard,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  childColors,
  childColorWithOpacity,
  hitSlop,
  minTouchTarget,
  fonts,
} from '@/constants/theme';
import { useEntriesStore, mapSupabaseEntry } from '@/stores/entriesStore';
import type { Entry } from '@/stores/entriesStore';
import { useChildrenStore, type Child } from '@/stores/childrenStore';
import { useAuthStore } from '@/stores/authStore';
import { entriesService } from '@/services/entries.service';
import { storageService } from '@/services/storage.service';
import TagPill from '@/components/TagPill';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import FavoriteAnimation from '@/components/FavoriteAnimation';
import ChildSelectModal from '@/components/ChildSelectModal';
import CityAutocomplete from '@/components/CityAutocomplete';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useLocationPermission, useLocation } from '@/hooks/useLocation';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { detectChildren, detectTags } from '@/lib/autoDetect';
import { formatDate, formatTime, formatDuration, getAge } from '@/lib/dateUtils';
import { tagsService } from '@/services/tags.service';
import { useDraftStore } from '@/stores/draftStore';
import { useSubscription } from '@/hooks/useSubscription';
import { audioCleanupService } from '@/services/audioCleanup.service';
import { notificationsService } from '@/services/notifications.service';
import { startTrialIfNeeded } from '@/lib/subscriptionHelpers';

// ─── FadeInUp Wrapper ────────────────────────────────────

/**
 * Wraps children in a subtle slide-up + fade-in entrance.
 * Think of a card sliding up from just below where it sits —
 * it only moves 10px, so it feels snappy, not dramatic.
 */
function FadeInUp({ children, skip }: { children: React.ReactNode; skip: boolean }) {
  const opacity = useRef(new Animated.Value(skip ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(skip ? 0 : 10)).current;

  useEffect(() => {
    if (skip) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Frequent Tags ────────────────────────────────────────

const FREQUENT_TAGS = [
  'funny', 'milestone', 'first', 'sweet', 'family',
  'bedtime', 'outing', 'words', 'siblings', 'school',
];

// ─── Audio Constants ────────────────────────────────────

const MAX_RECORDING_DURATION_MS = 180_000; // 3 minutes

// ─── Waveform Constants ──────────────────────────────────

const WAVEFORM_BAR_COUNT = 25;
const WAVEFORM_BAR_WIDTH = 3;
const WAVEFORM_MIN_HEIGHT = 4;
const WAVEFORM_MAX_HEIGHT = 16;

// Pre-generate random "resting" heights for each bar so the
// waveform has an organic shape even when paused. Think of it
// like a fingerprint — each recording looks slightly different.
const BAR_REST_HEIGHTS = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, i) => {
  // Deterministic pseudo-random using the bar index — gives a
  // natural-looking waveform shape (taller in the middle, shorter
  // at the edges) plus some variation.
  const center = WAVEFORM_BAR_COUNT / 2;
  const distFromCenter = Math.abs(i - center) / center; // 0 at center, 1 at edges
  const base = 1 - distFromCenter * 0.6; // 0.4–1.0 range
  const jitter = ((i * 7 + 3) % 5) / 10; // 0.0–0.4 pseudo-random
  return WAVEFORM_MIN_HEIGHT + (WAVEFORM_MAX_HEIGHT - WAVEFORM_MIN_HEIGHT) * Math.min(base + jitter * 0.3, 1);
});

/**
 * Interpolate between two hex colors.
 * ratio=0 → colorA, ratio=1 → colorB.
 *
 * Think of mixing paint — ratio is how much of colorB
 * you pour into the bucket of colorA.
 */
function lerpColor(hexA: string, hexB: string, ratio: number): string {
  const rA = parseInt(hexA.slice(1, 3), 16);
  const gA = parseInt(hexA.slice(3, 5), 16);
  const bA = parseInt(hexA.slice(5, 7), 16);
  const rB = parseInt(hexB.slice(1, 3), 16);
  const gB = parseInt(hexB.slice(3, 5), 16);
  const bB = parseInt(hexB.slice(5, 7), 16);
  const r = Math.round(rA + (rB - rA) * ratio);
  const g = Math.round(gA + (gB - gA) * ratio);
  const b = Math.round(bA + (bB - bA) * ratio);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Get the color for a specific waveform bar based on
 * the entry's tagged children. Single child → one color.
 * Multiple children → gradient flowing between their colors.
 * No children → accent fallback.
 */
function getBarColor(barIndex: number, childHexColors: string[]): string {
  if (childHexColors.length === 0) return colors.accent;
  if (childHexColors.length === 1) return childHexColors[0];

  // Map barIndex to a position in the gradient (0–1)
  const t = barIndex / (WAVEFORM_BAR_COUNT - 1);
  // Figure out which two colors we're between
  const segments = childHexColors.length - 1;
  const segmentIndex = Math.min(Math.floor(t * segments), segments - 1);
  const segmentRatio = (t * segments) - segmentIndex;
  return lerpColor(childHexColors[segmentIndex], childHexColors[segmentIndex + 1], segmentRatio);
}

// ─── Helpers (shared from lib/) ───────────────────────────

// ─── Entry Detail Screen ──────────────────────────────────

export default function EntryDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // ─── Route Params ──────────────────────────────────────
  //
  // This screen works in two modes:
  //   1. Existing entry: params.entryId → fetch from Supabase
  //   2. New entry (from recording): params.transcript + params.audioUri
  //      → create in Supabase, then display
  //
  // Think of it like opening a document — either you open an
  // existing file (entryId) or you create a new one from
  // what you just wrote (transcript + audioUri).

  const params = useLocalSearchParams<{
    entryId?: string;
    transcript?: string;
    audioUri?: string;
    locationText?: string;
    onboarding?: 'true';
    fromNotification?: string;
  }>();

  const allChildren = useChildrenStore((s) => s.children);
  const familyId = useAuthStore((s) => s.familyId);
  const session = useAuthStore((s) => s.session);

  // Subscription check — when the user doesn't have access (trial expired,
  // no subscription), we hide edit controls and audio playback.
  // They can still VIEW their memories and DELETE entries (data management right).
  const { hasAccess } = useSubscription();

  // Local store methods — update the cache after Supabase writes
  const addEntryLocal = useEntriesStore((s) => s.addEntryLocal);
  const updateEntryLocal = useEntriesStore((s) => s.updateEntryLocal);
  const removeEntryLocal = useEntriesStore((s) => s.removeEntryLocal);

  // Draft store — for saving entries offline
  const addDraft = useDraftStore((s) => s.addDraft);

  // Network status — checked before saving to decide online vs offline path
  const { isOnline } = useNetworkStatus();
  // Store in a ref to avoid stale closures in the effect below (same
  // pattern as locationTextRef — the effect captures the ref at render
  // time, but reads .current when it actually runs).
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;

  // ─── Entry State ───────────────────────────────────────
  //
  // The entry starts as null and gets populated either by
  // fetching an existing one or by creating a new one.

  const [entry, setEntry] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const titleWasImmediate = useRef(false);

  // Location — lightweight check for UI visibility decisions
  const { granted: permissionGranted } = useLocationPermission();

  // Full GPS detection — runs unconditionally (hook rules), but we only
  // USE the result when creating a new text entry that arrived without
  // a locationText param (e.g. "write instead" from home screen, or
  // recording screen where GPS was too slow to resolve in time).
  // Think of it like a safety net — catches location when the previous
  // screen couldn't provide it.
  const { locationText: detectedLocation, loading: locationLoading } = useLocation();
  const isNewEntryWithoutLocation =
    !params.entryId && params.transcript !== undefined && !params.locationText;

  const [editingLocation, setEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState('');

  // Local UI state
  const [transcript, setTranscript] = useState('');
  const [showChildPicker, setShowChildPicker] = useState(false);
  // When true, the child picker is mandatory — the user must select
  // at least one child before interacting with the rest of the entry.
  // This fires when the auto-detect found no child names in a
  // multi-child family (e.g. a "whole family" recording).
  const [needsChildSelection, setNeedsChildSelection] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReRecordDialog, setShowReRecordDialog] = useState(false);
  const [showAppendDialog, setShowAppendDialog] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [showBanner, setShowBanner] = useState(!!params.audioUri);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Favorite animation — burst originates from the tap position
  const [favAnimOrigin, setFavAnimOrigin] = useState<{ x: number; y: number } | null>(null);

  // Banner auto-dismiss (built-in Animated, not Reanimated)
  const bannerOpacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  // Debounce timer for transcript saves — we don't want to
  // hit Supabase on every single keystroke. Think of it like
  // Google Docs: it saves a moment after you stop typing.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Audio player — loads a signed URL from Supabase Storage
  // and gives us play/pause/seek/position/duration.
  const player = useAudioPlayer();

  // Destructure player.load so loadAudio's useCallback dependency
  // is stable. The player object itself is a new object every render
  // (because the hook returns { load, play, ... } as a literal),
  // but the individual functions inside are stable (wrapped in useCallback).
  const { load: playerLoad } = player;

  // Store the signed URL so we can retry on error/expiry
  const signedUrlRef = useRef<string | null>(null);

  // Track waveform area width for touch-to-seek calculations.
  // Ref (not state) because this value is only read inside
  // handleWaveformPress — it doesn't affect what renders.
  const waveformWidthRef = useRef(0);

  // Guard for auto-retry on signed URL expiry — only retry once per entry.
  // Reset when entry changes so a different entry's audio can get its own retry.
  const hasAutoRetried = useRef(false);
  useEffect(() => { hasAutoRetried.current = false; }, [entry?.id]);

  // Ref mirrors needsChildSelection so the beforeRemove listener (which
  // captures values at mount time) always reads the latest value.
  const needsChildSelectionRef = useRef(needsChildSelection);
  needsChildSelectionRef.current = needsChildSelection;

  // Block back-navigation (hardware back on Android, swipe-back on iOS)
  // while the child selection modal is open. Without this, the user
  // could leave the screen with zero children on the entry.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!needsChildSelectionRef.current) return; // not mandatory — allow
      e.preventDefault(); // block navigation
    });
    return unsubscribe;
  }, [navigation]);

  // Static waveform bar heights — no animation needed. The visual
  // "movement" comes from the color sweep (bars fill from muted to
  // full color as playback progresses, like a SoundCloud waveform).

  // ─── Load or Create Entry ──────────────────────────────
  //
  // On mount, figure out which mode we're in:
  //   - entryId → fetch existing entry from Supabase
  //   - transcript/audioUri → create a new entry in Supabase
  //   - neither → show "no entry" screen

  useEffect(() => {
    let cancelled = false;

    // Helper: save the current recording as an offline draft and navigate away.
    // Extracted so both the proactive offline check and the network-error catch
    // block can use the same logic (no copy-paste, no divergence).
    async function saveDraftAndNavigate(isOnboarding: boolean) {
      const userId = session?.user?.id;
      if (!userId) throw new Error('No session — cannot save draft');

      // First create the draft to get its ID, then use that ID for the audio filename.
      // This ensures the filename matches the draft's localId (no mismatch).
      const localId = addDraft({
        userId,
        transcript: params.transcript || '',
        audioLocalUri: null, // We'll update this after persisting the audio
        entryDate: new Date().toISOString(),
        entryType: params.audioUri ? 'voice' : 'text',
        locationText: params.locationText || null,
        familyId: familyId!,
        isOnboarding,
      });

      // Copy audio to persistent storage (cache can be wiped by the OS)
      if (params.audioUri) {
        const persistentUri = audioCleanupService.persistAudioForDraft(
          params.audioUri,
          localId,
        );
        useDraftStore.getState().updateDraft(localId, { audioLocalUri: persistentUri });
      }

      // Navigate away — the draft will sync automatically when online
      if (isOnboarding) {
        router.replace('/(onboarding)/memory-saved');
      } else {
        router.back();
      }
    }

    async function loadEntry() {
      try {
        if (params.entryId) {
          // ── Mode 1: Existing entry ──
          const row = await entriesService.getEntry(params.entryId);
          if (cancelled) return;
          const mapped = mapSupabaseEntry(row);
          setEntry(mapped);
          setTranscript(mapped.text);
          setLocationInput(mapped.locationText ?? '');
        } else if (params.transcript !== undefined || params.audioUri) {
          // ── Mode 2: New entry from recording ──
          if (!familyId) throw new Error('No family — cannot create entry');

          const isOnboarding = params.onboarding === 'true';

          // ── Offline check ──
          // If we're offline, save as a draft instead of hitting Supabase.
          // Think of it like writing a letter when the post office is closed —
          // you put it in your outbox and it gets mailed when they reopen.
          if (!isOnlineRef.current) {
            await saveDraftAndNavigate(isOnboarding);
            return;
          }

          // ── Online path (existing flow) ──

          // Step 1: Create the entry row in the database
          const row = await entriesService.create({
            family_id: familyId,
            transcript: params.transcript || '',
            entry_date: new Date().toISOString(),
            entry_type: params.audioUri ? 'voice' : 'text',
            location_text: params.locationText || null,
            ...(isOnboarding && { is_favorited: true }),
          });
          if (cancelled) return;

          // Steps 2-4 run in parallel — audio upload, child/tag
          // detection, and AI processing don't depend on each other,
          // so running them at the same time saves ~1-2 seconds.

          const transcriptText = params.transcript || '';

          // Branch A: Upload audio (if we have a recording)
          const audioPromise = params.audioUri
            ? storageService.uploadAudio(row.id, params.audioUri)
                .then(async (storagePath) => {
                  await entriesService.update(row.id, { audio_storage_path: storagePath });
                  // Clean up local .wav after successful upload
                  await audioCleanupService.deleteLocalFile(params.audioUri!);
                })
                .catch((uploadErr) => {
                  // Audio upload failed — entry still saved with text
                  console.warn('Audio upload failed:', uploadErr);
                })
            : Promise.resolve();

          // Branch B: Auto-detect children + tags from transcript
          const detectPromise = (async () => {
            // Detect children mentioned by name/nickname
            let detectedChildIds = detectChildren(transcriptText, allChildren);
            // Single child → auto-assign (no ambiguity).
            // Multi-child + no detection → leave empty; the mandatory
            // child picker will prompt the user to choose.
            if (detectedChildIds.length === 0 && allChildren.length === 1) {
              detectedChildIds = [allChildren[0].id];
            }
            if (detectedChildIds.length > 0) {
              try {
                await entriesService.setEntryChildren(row.id, detectedChildIds, true);
              } catch (childErr) {
                console.warn('Failed to assign children:', childErr);
              }
            }
            // Detect tags from keywords (+ first-memory tag for onboarding)
            try {
              const allTags = await tagsService.getSystemTags();
              const detectedTagIds = detectTags(transcriptText, allTags);
              const allTagIds = new Set(detectedTagIds);
              if (isOnboarding) {
                const firstMemoryTag = allTags.find((t) => t.slug === 'first-memory');
                if (firstMemoryTag) allTagIds.add(firstMemoryTag.id);
              }
              if (allTagIds.size > 0) {
                await entriesService.setEntryTags(row.id, [...allTagIds], true);
              }
            } catch (tagErr) {
              console.warn('Failed to auto-detect tags:', tagErr);
            }
          })();

          // Branch C: AI processing — generates a title and cleans
          // the transcript via the process-entry edge function.
          // Only needs row.id (reads transcript from DB), so it can
          // start immediately alongside audio + detection.
          const aiPromise = entriesService.processWithAI(row.id)
            .catch(() => null); // nice-to-have — don't block on failure

          // Wait for audio + detection (needed for getEntry joins).
          // AI runs independently — we handle its result below.
          await Promise.all([audioPromise, detectPromise]);

          // Step 5: Fetch the full entry (with joins) for display.
          // If AI was fast enough, this already has the title +
          // cleaned transcript. If not, we patch the title below.
          const fullRow = await entriesService.getEntry(row.id);
          if (cancelled) return;
          const mapped = mapSupabaseEntry(fullRow);
          setEntry(mapped);
          setTranscript(mapped.text);
          setLocationInput(mapped.locationText ?? '');

          // Multi-child family + no children detected → show the modal
          // so the user can pick who this memory is about.
          if (mapped.childIds.length === 0 && allChildren.length > 1) {
            setNeedsChildSelection(true);
          }

          // If AI was fast and title is already here, skip the fade-in animation
          if (mapped.title) {
            titleWasImmediate.current = true;
          }

          // Also add to local cache so Home shows it immediately
          addEntryLocal(mapped);

          // Start the free trial when the first entry is saved.
          // Idempotent — safe to call even if trial already started.
          await startTrialIfNeeded();

          // If this entry was created from a notification tap, mark it
          // in notification_log so we can track conversion (fire-and-forget).
          if (params.fromNotification && params.fromNotification !== '') {
            const logId = params.fromNotification === 'true' ? null : params.fromNotification;
            if (logId) {
              notificationsService.markResultedInEntry(logId).catch(
                (err) => console.warn('Failed to mark notification result:', err)
              );
            }
          }

          // Onboarding: redirect to memory-saved — don't stay on entry-detail
          if (isOnboarding) {
            entriesService.processWithAI(row.id).catch(() => {});
            router.replace('/(onboarding)/memory-saved');
            return;
          }

          // If AI hasn't finished yet, patch the title when it arrives.
          // (If it already finished, getEntry above caught the title.)
          if (!mapped.title) {
            aiPromise.then((result) => {
              if (cancelled) return;
              if (!result?.title) return;
              setEntry((prev) => prev ? { ...prev, title: result.title } : prev);
              updateEntryLocal(row.id, { title: result.title });
            });
          }
        } else {
          // No params at all — nothing to show
          setEntry(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('Entry load/create failed:', err);

        // Onboarding: don't trap the user — navigate away even on failure
        if (params.onboarding === 'true') {
          console.error('Failed to save onboarding voice entry:', err);
          router.replace('/(onboarding)/memory-saved');
          return;
        }

        const msg = err instanceof Error ? err.message : String(err);
        // Give a friendlier message for network errors — also offer to save as draft
        if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
          // Try to save as a draft so the recording isn't lost
          if (session?.user?.id && familyId && (params.transcript !== undefined || params.audioUri)) {
            try {
              await saveDraftAndNavigate(params.onboarding === 'true');
              return;
            } catch {
              // Draft save also failed — fall through to error state
            }
          }
          setError('No internet connection — check your network and try again');
        } else {
          setError(msg || 'Something went wrong');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadEntry();
    return () => { cancelled = true; };
  }, [params.entryId, retryCount]);

  // ─── Location Fallback ────────────────────────────────
  //
  // "Create then update" pattern: if this is a new entry that was
  // created without location (e.g. "write instead" from home, or
  // GPS was slow during recording), patch the entry once our own
  // useLocation() hook resolves. Think of it like mailing a letter
  // and then calling to add a return address you forgot.
  useEffect(() => {
    if (
      !isNewEntryWithoutLocation ||  // only for new entries missing location
      locationLoading ||             // wait for GPS to finish
      !detectedLocation ||           // GPS failed or no result — nothing to patch
      !entry ||                      // entry not created yet
      entry.locationText             // entry already has a location (user set manually)
    ) return;

    // Patch local state
    setEntry((prev) => prev ? { ...prev, locationText: detectedLocation } : prev);
    setLocationInput(detectedLocation);
    updateEntryLocal(entry.id, { locationText: detectedLocation });

    // Patch Supabase in the background
    entriesService.update(entry.id, { location_text: detectedLocation })
      .catch((err) => console.warn('Failed to patch location:', err));
  }, [isNewEntryWithoutLocation, locationLoading, detectedLocation, entry?.id, entry?.locationText]);

  // Banner auto-dismiss
  useEffect(() => {
    if (showBanner && entry?.hasAudio) {
      const timer = setTimeout(() => {
        if (reduceMotion) {
          bannerOpacity.setValue(0);
          setShowBanner(false);
        } else {
          Animated.timing(bannerOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start(() => setShowBanner(false));
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showBanner, entry]);

  // ─── Load Audio for Playback ──────────────────────────
  //
  // When we have an entry with audio, get a signed URL from
  // Supabase Storage and load it into the player. The signed
  // URL is like a temporary pass — it expires after 1 hour.
  // We store it in a ref so we can retry on error/expiry.

  const loadAudio = useCallback(async (storagePath: string) => {
    try {
      const url = await storageService.getPlaybackUrl(storagePath);
      signedUrlRef.current = url;
      await playerLoad(url);
    } catch (err) {
      console.warn('Failed to load audio for playback:', err);
    }
  }, [playerLoad]);

  useEffect(() => {
    if (!entry?.hasAudio || !entry.audioStoragePath) return;

    let cancelled = false;
    const path = entry.audioStoragePath;
    (async () => {
      if (cancelled) return;
      await loadAudio(path);
    })();

    return () => { cancelled = true; };
  }, [entry?.id, entry?.hasAudio]);

  // ─── Refresh on Focus (for Re-Record) ──────────────────
  //
  // When the user comes back from re-recording, the entry
  // has been updated in Supabase but our local state is stale.
  // We listen for the screen regaining focus and refetch.

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      if (!entry?.id) return;
      try {
        const row = await entriesService.getEntry(entry.id);
        const mapped = mapSupabaseEntry(row);
        setEntry(mapped);
        setTranscript(mapped.text);
        updateEntryLocal(entry.id, mapped);
      } catch {
        // Entry may have been deleted — ignore
      }
    });
    return unsubscribe;
  }, [navigation, entry?.id]);


  // ─── Auto-Retry on Signed URL Expiry ─────────────────────
  //
  // If the audio was loaded successfully but later fails (e.g.,
  // the 1-hour signed URL expired), auto-retry once by fetching
  // a fresh URL. We track a retry flag so we only try once —
  // if the fresh URL also fails, show the error state.

  useEffect(() => {
    if (!player.error || !entry?.audioStoragePath || hasAutoRetried.current) return;

    // Only auto-retry if we had a signed URL before (meaning it
    // worked at some point and probably just expired)
    if (signedUrlRef.current) {
      hasAutoRetried.current = true;
      loadAudio(entry.audioStoragePath);
    }
  }, [player.error, entry?.audioStoragePath, loadAudio]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ─── Derived Data (must be above early returns) ───────
  //
  // These computations use hooks (useMemo), so they MUST run
  // on every single render — even loading/error renders.
  // Think of it like a roll call: React counts hooks in order,
  // so if you skip one on some renders, the count doesn't
  // match and React panics.

  // Memoized because during playback the component re-renders every ~500ms
  // (audio position updates). Without useMemo, these recompute on every tick
  // even though childIds and allChildren rarely change.
  const entryChildren = useMemo(
    () => (entry?.childIds ?? [])
      .map((id) => allChildren.find((c) => c.id === id))
      .filter(Boolean) as Child[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entry?.childIds?.join(','), allChildren],
  );

  // Child hex colors for the waveform — look up each tagged child's color.
  // Depends on the memoized entryChildren so this only recomputes when
  // children actually change, not on every playback position update.
  const waveformChildColors = useMemo(
    () => entryChildren.map((c) => childColors[c.colorIndex]?.hex ?? childColors[0].hex),
    [entryChildren],
  );

  // Pre-compute all 25 bar colors once per waveform child change.
  // Without this, getBarColor() (hex parsing + RGB math) would be called
  // 25 times on every single render (~2× per second during playback).
  const barColors = useMemo(
    () => BAR_REST_HEIGHTS.map((_, i) => getBarColor(i, waveformChildColors)),
    [waveformChildColors],
  );

  // Use a ref to always read the latest entry/transcript inside the keyboard listener.
  // A plain variable would create a stale closure — the listener is registered once
  // and would forever see the values from that first render.
  const entryRef = useRef(entry);
  const transcriptRef = useRef(transcript);
  useEffect(() => { entryRef.current = entry; }, [entry]);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  // Reads only from refs — no stale closure risk, so useCallback with [] is safe.
  const triggerAITitleIfNeeded = useCallback(() => {
    const currentEntry = entryRef.current;
    const currentTranscript = transcriptRef.current;
    if (!currentEntry || currentEntry.title || !currentTranscript.trim()) return;

    // Cancel any pending debounce save and flush immediately so the edge
    // function reads the latest transcript from the DB.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const entryId = currentEntry.id;
    entriesService.update(entryId, { transcript: currentTranscript })
      .then(() => entriesService.processWithAI(entryId))
      .then((result) => {
        if (result?.title) {
          setEntry((prev) => prev ? { ...prev, title: result.title } : prev);
          updateEntryLocal(entryId, { title: result.title });
        }
      })
      .catch((err) => console.warn('AI title trigger failed:', err));
  }, []);

  // Trigger on keyboard hide (user taps "done") or back-navigation (user leaves
  // without dismissing keyboard).
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', triggerAITitleIfNeeded);
    return () => sub.remove();
  }, [triggerAITitleIfNeeded]);

  useEffect(() => {
    return navigation.addListener('beforeRemove', triggerAITitleIfNeeded);
  }, [navigation, triggerAITitleIfNeeded]);

  // ─── Loading State ──────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // ─── Error State ────────────────────────────────────────

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>{error}</Text>
        <Pressable
          onPress={() => {
            setError(null);
            setIsLoading(true);
            setRetryCount((c) => c + 1);
          }}
        >
          <Text style={styles.retryLink}>Retry</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>No entry to display</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const untaggedChildren = allChildren.filter(
    (c) => !entry.childIds.includes(c.id),
  );
  const allChildrenTagged = untaggedChildren.length === 0;

  // ─── Handlers ──────────────────────────────────────────

  // Debounced title save — same pattern as transcript below.
  // Updates local state instantly, saves to Supabase after 800ms idle.
  // Keeps empty string (not undefined) so the TextInput stays visible
  // when the user clears the title. Character limit is on the TextInput
  // (maxLength), and we strip newlines here so it stays single-line.
  const handleTitleChange = (text: string) => {
    const cleaned = text.replace(/\n/g, ' ');

    setEntry((prev) => prev ? { ...prev, title: cleaned } : prev);
    updateEntryLocal(entry.id, { title: cleaned || undefined });

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await entriesService.update(entry.id, { title: cleaned || null });
        setSaveIndicator(true);
        setTimeout(() => setSaveIndicator(false), 2000);
      } catch (err) {
        console.warn('Failed to save title:', err);
      }
    }, 800);
  };

  // Debounced transcript save — updates local state immediately
  // (so typing feels instant) but waits 800ms before sending
  // the change to Supabase. If you keep typing, the timer
  // resets, so only the final version gets saved.
  const handleTranscriptChange = (text: string) => {
    setTranscript(text);
    setEntry((prev) => prev ? { ...prev, text } : prev);
    updateEntryLocal(entry.id, { text });

    // Debounce the Supabase save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await entriesService.update(entry.id, { transcript: text });
        setSaveIndicator(true);
        setTimeout(() => setSaveIndicator(false), 2000);
      } catch (err) {
        console.warn('Failed to save transcript:', err);
      }
    }, 800);
  };

  const handleAddChildToEntry = async (childId: string) => {
    const newIds = [...entry.childIds, childId];
    // Optimistic update — show change immediately
    setEntry((prev) => prev ? { ...prev, childIds: newIds } : prev);
    updateEntryLocal(entry.id, { childIds: newIds });
    try {
      await entriesService.setEntryChildren(entry.id, newIds);
    } catch (err) {
      // Revert on failure
      console.warn('Failed to update children:', err);
      setEntry((prev) => prev ? { ...prev, childIds: entry.childIds } : prev);
      updateEntryLocal(entry.id, { childIds: entry.childIds });
    }
  };

  const handleRemoveChildFromEntry = async (childId: string) => {
    if (entry.childIds.length <= 1) {
      setShowChildPicker(true);
      return;
    }
    const newIds = entry.childIds.filter((id) => id !== childId);
    setEntry((prev) => prev ? { ...prev, childIds: newIds } : prev);
    updateEntryLocal(entry.id, { childIds: newIds });
    try {
      await entriesService.setEntryChildren(entry.id, newIds);
    } catch (err) {
      console.warn('Failed to remove child:', err);
      setEntry((prev) => prev ? { ...prev, childIds: entry.childIds } : prev);
      updateEntryLocal(entry.id, { childIds: entry.childIds });
    }
  };

  const handleToggleChildInPicker = (childId: string) => {
    if (entry.childIds.includes(childId)) {
      if (entry.childIds.length > 1) {
        handleRemoveChildFromEntry(childId);
      }
    } else {
      handleAddChildToEntry(childId);
    }
  };

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || entry.tags.includes(trimmed)) return;
    const newTags = [...entry.tags, trimmed];
    setEntry((prev) => prev ? { ...prev, tags: newTags } : prev);
    updateEntryLocal(entry.id, { tags: newTags });
    setTagInput('');
    // Tag sync to Supabase is complex (needs tag IDs, not slugs).
    // Chunk 11 will handle this with auto-detection + proper tag lookup.
  };

  const handleRemoveTag = (tag: string) => {
    const newTags = entry.tags.filter((t) => t !== tag);
    setEntry((prev) => prev ? { ...prev, tags: newTags } : prev);
    updateEntryLocal(entry.id, { tags: newTags });
  };

  const handleToggleFavorite = async (e?: GestureResponderEvent) => {
    // Optimistic update
    const newVal = !entry.isFavorited;
    setEntry((prev) => prev ? { ...prev, isFavorited: newVal } : prev);
    updateEntryLocal(entry.id, { isFavorited: newVal });

    // Trigger "catch a firefly" burst when favoriting (not unfavoriting).
    // pageX/pageY from the press event gives the exact tap position.
    if (newVal && e) {
      setFavAnimOrigin({
        x: e.nativeEvent.pageX,
        y: e.nativeEvent.pageY,
      });
    }

    try {
      await entriesService.toggleFavorite(entry.id);
    } catch (err) {
      // Revert on failure
      console.warn('Failed to toggle favorite:', err);
      setEntry((prev) => prev ? { ...prev, isFavorited: !newVal } : prev);
      updateEntryLocal(entry.id, { isFavorited: !newVal });
    }
  };

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    try {
      await entriesService.softDelete(entry.id);
      removeEntryLocal(entry.id);
      router.back();
    } catch (err) {
      console.warn('Failed to delete entry:', err);
    }
  };

  const handleLocationSave = async (text: string) => {
    const loc = text.trim() || undefined;
    setEntry((prev) => prev ? { ...prev, locationText: loc } : prev);
    updateEntryLocal(entry.id, { locationText: loc });
    setEditingLocation(false);
    try {
      await entriesService.update(entry.id, {
        location_text: loc || null,
      });
    } catch (err) {
      console.warn('Failed to save location:', err);
    }
  };

  // Date picker — lets users backdate entries (but not into the future).
  // On iOS the picker is inline (appears below the date line).
  // On Android the picker is a native modal dialog.
  const handleDateChange = async (_event: any, selectedDate?: Date) => {
    // On Android, the picker fires the event and closes itself.
    // On iOS, it stays open — we dismiss it via a Done button.
    if (Platform.OS === 'android') setShowDatePicker(false);

    if (!selectedDate) return;

    // Block future dates — you can't create a memory that
    // hasn't happened yet!
    const now = new Date();
    if (selectedDate > now) return;

    const newDate = selectedDate.toISOString();
    setEntry((prev) => prev ? { ...prev, date: newDate } : prev);
    updateEntryLocal(entry.id, { date: newDate });
    try {
      await entriesService.update(entry.id, { entry_date: newDate });
    } catch (err) {
      console.warn('Failed to update date:', err);
    }
  };

  const handleReRecord = () => {
    setShowReRecordDialog(false);
    router.push({
      pathname: '/(main)/recording',
      params: { reRecordEntryId: entry.id },
    });
  };

  const handleAppendAudio = () => {
    setShowAppendDialog(false);
    router.push({
      pathname: '/(main)/recording',
      params: {
        appendEntryId: entry.id,
        appendStoragePath: entry.audioStoragePath ?? '',
        appendTranscript: transcript,
      },
    });
  };

  // Touch-to-seek — tap anywhere on the waveform to jump
  // to that position in the audio. Think of it like tapping
  // a spot on a ruler — we figure out what percentage of the
  // way across you tapped and jump to that % of the duration.
  const handleWaveformPress = (event: GestureResponderEvent) => {
    if (!player.isLoaded || player.duration <= 0 || waveformWidthRef.current <= 0) return;
    const tapX = event.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, tapX / waveformWidthRef.current));
    const positionMs = ratio * player.duration;
    player.seek(positionMs);
  };

  // Retry loading audio — used by error state's retry button
  // and by the URL-expiry auto-retry
  const handleAudioRetry = async () => {
    if (!entry.audioStoragePath) return;
    await loadAudio(entry.audioStoragePath);
  };

  // Determine the audio bar state for rendering
  const isVoiceEntry = entry.entryType === 'voice';
  const audioIsLoading = entry.hasAudio && !player.isLoaded && !player.error;
  const audioHasError = !!player.error;
  const audioMissing = isVoiceEntry && !entry.hasAudio;

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing(3) }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={hitSlop.icon}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.topBarRight}>
          {/* Favorite toggle — hidden when user doesn't have access */}
          {hasAccess && (
            <Pressable
              onPress={(e) => handleToggleFavorite(e)}
              hitSlop={hitSlop.icon}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons
                name={entry.isFavorited ? 'heart' : 'heart-outline'}
                size={22}
                color={entry.isFavorited ? colors.heartFilled : colors.heartEmpty}
              />
            </Pressable>
          )}
          <Pressable
            onPress={() => setShowDeleteDialog(true)}
            hitSlop={hitSlop.icon}
            style={({ pressed }) => [styles.overflowBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.overflowText}>···</Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing(10) }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={spacing(6)}
      >
        {/* Post-recording banner */}
        {showBanner && entry.hasAudio && (
          <Animated.View style={[styles.banner, { opacity: bannerOpacity }]}>
            <Ionicons name="heart" size={16} color={colors.accent} />
            <Text style={styles.bannerText}>Memory saved</Text>
          </Animated.View>
        )}

        {/* ── 1. Title — the hero element ── */}
        <FadeInUp skip={reduceMotion || titleWasImmediate.current}>
          <TextInput
            style={styles.titleText}
            value={entry.title ?? ''}
            onChangeText={handleTitleChange}
            placeholder="Add a title..."
            placeholderTextColor={colors.textMuted}
            maxLength={60}
            multiline
            blurOnSubmit
            editable={hasAccess}
          />
        </FadeInUp>

        {/* ── 2. Gradient divider — child colors ── */}
        <LinearGradient
          colors={
            waveformChildColors.length >= 2
              ? [waveformChildColors[0], waveformChildColors[waveformChildColors.length - 1]]
              : waveformChildColors.length === 1
                ? [waveformChildColors[0], waveformChildColors[0]]
                : [colors.accent, colors.accent]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientDivider}
        />

        {/* ── 3. Mini child pills + add button ── */}
        <View style={styles.childLine}>
          {entryChildren.map((child) => {
            const hex = childColors[child.colorIndex]?.hex ?? childColors[0].hex;
            const age = getAge(child.birthday, entry.date);
            return (
              <View
                key={child.id}
                style={[styles.miniPill, { backgroundColor: childColorWithOpacity(hex, 0.12) }]}
              >
                <View style={[styles.miniPillDot, { backgroundColor: hex }]} />
                <Text style={[styles.miniPillName, { color: hex }]}>{child.name}</Text>
                <Text style={[styles.miniPillAge, { color: childColorWithOpacity(hex, 0.6) }]}>{age}</Text>
                {hasAccess && (
                  <Pressable
                    onPress={() => handleRemoveChildFromEntry(child.id)}
                    hitSlop={hitSlop.icon}
                  >
                    <Text style={[styles.miniPillRemove, { color: hex }]}>×</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
          {hasAccess && !allChildrenTagged && (
            <Pressable
              onPress={() => setShowChildPicker(!showChildPicker)}
              hitSlop={hitSlop.icon}
              style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="add" size={12} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* ── 4. Metadata line — date · time · location (inline) ── */}
        <View style={styles.metaLine}>
          <Pressable onPress={() => hasAccess && setShowDatePicker(true)} disabled={!hasAccess}>
            <Text style={styles.metaText}>
              {formatDate(entry.date, 'long')} · {formatTime(entry.createdAt ?? entry.date)}
            </Text>
          </Pressable>
          {entry.locationText ? (
            <Pressable onPress={() => hasAccess && setEditingLocation(true)} disabled={!hasAccess}>
              <Text style={styles.metaText}> · {entry.locationText}</Text>
            </Pressable>
          ) : hasAccess && permissionGranted && !editingLocation ? (
            <Pressable onPress={() => setEditingLocation(true)}>
              <Text style={styles.metaLocationAdd}> · + Add location</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Inline date picker — iOS shows inline, Android shows modal */}
        {showDatePicker && (
          <FadeInUp skip={reduceMotion}>
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={new Date(entry.date)}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={handleDateChange}
                accentColor={colors.accent}
              />
              {Platform.OS === 'ios' && (
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  style={styles.datePickerDone}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </Pressable>
              )}
            </View>
          </FadeInUp>
        )}

        {/* Location editor — expands inline when editing */}
        {editingLocation && permissionGranted && (
          <FadeInUp skip={reduceMotion}>
            <View style={styles.locationEditorCard}>
              <CityAutocomplete
                value={locationInput}
                onChangeText={setLocationInput}
                onSelect={setLocationInput}
                onSubmit={() => handleLocationSave(locationInput)}
                autoFocus
              />
              <View style={styles.locationActions}>
                <Pressable
                  onPress={() => {
                    setLocationInput('');
                    handleLocationSave('');
                  }}
                  style={styles.locationClearBtn}
                >
                  <Text style={styles.locationClearText}>Clear</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleLocationSave(locationInput)}
                  style={styles.locationDoneBtn}
                >
                  <Text style={styles.locationDoneText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </FadeInUp>
        )}

        {/* Child Picker — expands inline when adding children */}
        {showChildPicker && (
          <FadeInUp skip={reduceMotion}>
            <View style={styles.pickerCard}>
              {allChildren.map((child) => {
                const isSelected = entry.childIds.includes(child.id);
                const hex = childColors[child.colorIndex]?.hex ?? childColors[0].hex;
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => handleToggleChildInPicker(child.id)}
                    style={[
                      styles.pickerPill,
                      {
                        borderColor: isSelected ? hex : colors.border,
                        backgroundColor: isSelected
                          ? childColorWithOpacity(hex, 0.12)
                          : colors.card,
                      },
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={hex} />
                    )}
                    <Text
                      style={[
                        styles.pickerPillText,
                        { color: isSelected ? hex : colors.textMuted },
                      ]}
                    >
                      {child.name}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setShowChildPicker(false)}
                style={styles.pickerDone}
              >
                <Text style={styles.pickerDoneText}>Done</Text>
              </Pressable>
            </View>
          </FadeInUp>
        )}

        {/* ── 5. Transcript — flows on page background, no card ── */}

        {/* Transcript hint — when voice recording produced no text */}
        {isVoiceEntry && !transcript && (
          <View style={styles.transcriptHint}>
            <Ionicons name="create-outline" size={14} color={colors.textMuted} />
            <Text style={styles.transcriptHintText}>
              No speech detected — type your memory below
            </Text>
          </View>
        )}

        <View style={styles.transcriptCard}>
          <TextInput
            style={styles.transcriptInput}
            value={transcript}
            onChangeText={handleTranscriptChange}
            placeholder="Start typing your memory..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            editable={hasAccess}
          />
        </View>
        {saveIndicator && (
          <Text style={styles.savedIndicator}>All changes saved</Text>
        )}

        {/* ── 6. Audio Playback Bar — prominent, below transcript ── */}
        {/* When the user doesn't have access (lapsed trial), show a locked
            message instead of the audio player. They can still see the
            transcript — we just lock audio playback behind the paywall. */}
        {isVoiceEntry && !hasAccess && (
          <View style={styles.audioLocked}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
            <Text style={styles.audioLockedText}>Subscribe to play audio</Text>
          </View>
        )}
        {isVoiceEntry && hasAccess && (
          <View style={styles.audioBar}>
            {/* Play button / Loading spinner / Error icon */}
            <Pressable
              onPress={() => {
                if (audioHasError || audioMissing || audioIsLoading) return;
                player.isPlaying ? player.pause() : player.play();
              }}
              style={styles.playBtn}
              disabled={!player.isLoaded}
            >
              {audioIsLoading ? (
                <ActivityIndicator size={14} color={colors.accent} />
              ) : audioHasError ? (
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
              ) : (
                <Ionicons
                  name={player.isPlaying ? 'pause' : 'play'}
                  size={16}
                  color={player.isLoaded ? colors.accent : colors.textMuted}
                />
              )}
            </Pressable>

            {/* Waveform area / Error text / No-audio text */}
            {audioHasError ? (
              <View style={styles.waveformMessageArea}>
                <Text style={styles.audioErrorText}>Couldn't load audio</Text>
                <Text style={styles.audioErrorDot}> · </Text>
                <Pressable onPress={handleAudioRetry} hitSlop={hitSlop.icon}>
                  <Text style={styles.audioRetryLink}>Retry</Text>
                </Pressable>
              </View>
            ) : audioMissing ? (
              <View style={styles.waveformMessageArea}>
                <Text style={styles.audioMissingText}>Audio unavailable</Text>
              </View>
            ) : (
              <Pressable
                style={styles.waveformArea}
                onPress={handleWaveformPress}
                onLayout={(e) => { waveformWidthRef.current = e.nativeEvent.layout.width; }}
                disabled={!player.isLoaded}
              >
                {BAR_REST_HEIGHTS.map((barHeight, i) => {
                  const barRatio = i / (WAVEFORM_BAR_COUNT - 1);
                  const playedRatio = player.duration > 0
                    ? player.position / player.duration
                    : 0;
                  const isPlayed = barRatio <= playedRatio;
                  const barHex = barColors[i];

                  return (
                    <View
                      key={i}
                      style={{
                        width: WAVEFORM_BAR_WIDTH,
                        height: barHeight,
                        borderRadius: WAVEFORM_BAR_WIDTH / 2,
                        backgroundColor: isPlayed
                          ? barHex
                          : childColorWithOpacity(barHex, 0.3),
                      }}
                    />
                  );
                })}
              </Pressable>
            )}

            {/* Duration / Loading text */}
            {!audioHasError && !audioMissing && (
              <Text style={styles.audioDuration}>
                {audioIsLoading
                  ? 'Loading...'
                  : player.duration > 0
                    ? formatDuration(player.isPlaying ? player.position : player.duration, true)
                    : '--:--'}
              </Text>
            )}

            {/* Re-record & Add More buttons (hidden during loading) */}
            {!audioIsLoading && (
              <View style={styles.audioActions}>
                <Pressable
                  onPress={() => setShowReRecordDialog(true)}
                  hitSlop={hitSlop.icon}
                  style={({ pressed }) => [styles.reRecordBtn, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons name="mic-outline" size={18} color={colors.accent} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (player.duration >= MAX_RECORDING_DURATION_MS) {
                      Alert.alert(
                        'This memory is full',
                        'Recordings can be up to three minutes. You can record again to start fresh.',
                      );
                    } else {
                      setShowAppendDialog(true);
                    }
                  }}
                  hitSlop={hitSlop.icon}
                  style={({ pressed }) => [
                    styles.reRecordBtn,
                    pressed && { opacity: 0.6 },
                    player.duration >= MAX_RECORDING_DURATION_MS && { opacity: 0.35 },
                  ]}
                >
                  <Ionicons name="add-outline" size={18} color={colors.accent} />
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* ── 7. Tags — footnote styling at the very bottom ── */}
        <View style={styles.tagsRow}>
          {entry.tags.map((tag) => (
            <TagPill
              key={tag}
              label={tag}
              variant="muted"
              onRemove={hasAccess ? () => handleRemoveTag(tag) : undefined}
            />
          ))}
          {hasAccess && (
            <Pressable
              onPress={() => setShowTagEditor(!showTagEditor)}
              style={styles.addTagPill}
            >
              <Text style={styles.addTagPillText}>+ add tag</Text>
            </Pressable>
          )}
        </View>

        {/* Tag Editor */}
        {showTagEditor && (
          <FadeInUp skip={reduceMotion}>
            <View style={styles.tagEditorCard}>
              <TextInput
                style={styles.tagInput}
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add a tag..."
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={() => handleAddTag(tagInput)}
                returnKeyType="done"
              />
              <Text style={styles.frequentLabel}>Your Frequent Tags</Text>
              <View style={styles.frequentRow}>
                {FREQUENT_TAGS.map((tag) => {
                  const isAdded = entry.tags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() =>
                        isAdded ? handleRemoveTag(tag) : handleAddTag(tag)
                      }
                      style={[
                        styles.frequentPill,
                        isAdded && styles.frequentPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.frequentPillText,
                          isAdded && styles.frequentPillTextActive,
                        ]}
                      >
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </FadeInUp>
        )}
      </KeyboardAwareScrollView>

      {/* Delete confirmation */}
      <ConfirmationDialog
        visible={showDeleteDialog}
        title="Delete this memory?"
        body="Deleted entries can be recovered for 30 days."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {/* Re-record confirmation */}
      <ConfirmationDialog
        visible={showReRecordDialog}
        title="Record this again?"
        body="This will replace your current recording."
        confirmLabel="Record again"
        onConfirm={handleReRecord}
        onCancel={() => setShowReRecordDialog(false)}
      />

      {/* Append audio confirmation */}
      <ConfirmationDialog
        visible={showAppendDialog}
        title="Keep going?"
        body="Your new recording will be added to the end of this one."
        confirmLabel="Keep going"
        onConfirm={handleAppendAudio}
        onCancel={() => setShowAppendDialog(false)}
      />

      {/* Child selection modal — shown when no child names were detected */}
      <ChildSelectModal
        visible={needsChildSelection}
        familyChildren={allChildren}
        onConfirm={async (selectedIds) => {
          setNeedsChildSelection(false);
          // Update local state immediately so the UI reflects the choice
          setEntry((prev) => prev ? { ...prev, childIds: selectedIds } : prev);
          if (entry) {
            updateEntryLocal(entry.id, { childIds: selectedIds });
            try {
              await entriesService.setEntryChildren(entry.id, selectedIds);
            } catch (err) {
              console.warn('Failed to save child selection:', err);
            }
          }
        }}
      />

      {/* Favorite animation overlay — full-screen, non-blocking */}
      {favAnimOrigin && (
        <FavoriteAnimation
          originX={favAnimOrigin.x}
          originY={favAnimOrigin.y}
          onComplete={() => setFavAnimOrigin(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing(3),
  },
  emptyText: {
    ...typography.formLabel,
    color: colors.textMuted,
  },
  backLink: {
    ...typography.formLabel,
    color: colors.textMuted,
  },
  retryLink: {
    ...typography.formLabel,
    color: colors.accent,
    fontWeight: '600',
  },
  // ─── Top Bar ────────────────────────
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
  topBarRight: {
    flexDirection: 'row',
    gap: spacing(3),
  },
  iconBtn: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─── Scroll ─────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(10),
  },
  // ─── Banner ─────────────────────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.accentSoft,
    padding: spacing(3),
    borderRadius: radii.md,
    marginBottom: spacing(4),
  },
  bannerText: {
    ...typography.formLabel,
    color: colors.accent,
    fontWeight: '600',
  },
  // ─── Title (hero element) ────────────
  titleText: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.text,
    lineHeight: 29,
    textAlign: 'left',
    marginBottom: spacing(2),
  },
  // ─── Gradient Divider ────────────────
  gradientDivider: {
    height: 3,
    borderRadius: 2,
    marginBottom: spacing(2),
  },
  // ─── Mini Child Pills ────────────────
  miniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  miniPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniPillName: {
    fontSize: 12,
    fontWeight: '600',
  },
  miniPillAge: {
    fontSize: 11,
    fontWeight: '400',
  },
  miniPillRemove: {
    fontSize: 11,
    opacity: 0.6,
    fontWeight: '700',
    marginLeft: 2,
  },
  // ─── Metadata Line ───────────────────
  metaLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: spacing(2),
    minHeight: minTouchTarget,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  metaLocationAdd: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  // ─── Overflow Button ─────────────────
  overflowBtn: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 2,
  },
  // ─── Date Picker ──────────────────
  datePickerContainer: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(4),
    alignItems: 'center',
  },
  datePickerDone: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    marginTop: spacing(2),
  },
  datePickerDoneText: {
    ...typography.formLabel,
    color: colors.accent,
  },
  // ─── Location ─────────────────────
  locationEditorCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(4),
  },
  locationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing(3),
    marginTop: spacing(2),
  },
  locationClearBtn: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationClearText: {
    ...typography.formLabel,
    color: colors.textMuted,
  },
  locationDoneBtn: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationDoneText: {
    ...typography.formLabel,
    color: colors.accent,
  },
  childLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(1),
  },
  addBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
  },
  // ─── Child Picker ───────────────────
  pickerCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing(3),
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
    marginBottom: spacing(4),
  },
  pickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  pickerPillText: {
    ...typography.pillLabel,
  },
  pickerDone: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
  },
  pickerDoneText: {
    ...typography.formLabel,
    color: colors.accent,
  },
  // ─── Tags (footnote-style at bottom) ─
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing(1.5),
    marginTop: spacing(5),
    marginBottom: spacing(4),
  },
  addTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  addTagPillText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
  },
  // ─── Tag Editor ─────────────────────
  tagEditorCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(4),
  },
  tagInput: {
    ...typography.formLabel,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing(2),
    marginBottom: spacing(3),
  },
  frequentLabel: {
    ...typography.timestamp,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing(2),
  },
  frequentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  frequentPill: {
    backgroundColor: colors.tag,
    paddingVertical: 4,
    paddingHorizontal: spacing(2),
    borderRadius: radii.sm,
    flexGrow: 1,
    alignItems: 'center',
  },
  frequentPillActive: {
    backgroundColor: colors.accentSoft,
  },
  frequentPillText: {
    ...typography.tag,
    color: colors.textSoft,
  },
  frequentPillTextActive: {
    color: colors.accent,
  },
  // ─── Transcript (flows on page bg) ──
  transcriptHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(2),
  },
  transcriptHintText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  transcriptCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing(4),
    marginTop: spacing(3),
    marginBottom: spacing(2),
  },
  transcriptInput: {
    ...typography.transcript,
    lineHeight: 25,
    color: colors.text,
    minHeight: 180,
  },
  savedIndicator: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing(4),
  },
  // ─── Audio Bar ──────────────────────
  // Shown when user's trial has expired — locked audio indicator
  audioLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    paddingVertical: spacing(4),
  },
  audioLockedText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  audioBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingVertical: spacing(3),
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: WAVEFORM_MAX_HEIGHT + 4, // +4 for breathing room
    minHeight: minTouchTarget, // 44px touch target
  },
  waveformMessageArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: WAVEFORM_MAX_HEIGHT + 4,
  },
  audioErrorText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  audioErrorDot: {
    ...typography.caption,
    color: colors.textMuted,
  },
  audioRetryLink: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  audioMissingText: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  audioDuration: {
    ...typography.caption,
    color: colors.textMuted,
  },
  audioActions: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  reRecordBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.accentSoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
  },
});
