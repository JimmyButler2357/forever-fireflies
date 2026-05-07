import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Animated,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  GestureResponderEvent,
  Alert,
  Image,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation, useFocusEffect } from 'expo-router';
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
import { capture } from '@/lib/posthog';
import { compressPhoto } from '@/lib/imageCompression';
import { getCachedPhotoUrl } from '@/lib/photoUrlCache';

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

// ─── Photo Grid Constants ──────────────────────────────
//
// The photo grid is a 2-up layout below the transcript.
// The actual thumb size is computed inside the component
// from useWindowDimensions() so it tracks viewport changes
// (e.g. browser resize during web preview) and stays bounded
// on wide viewports — see the photoThumbSize calculation.
const PHOTO_GRID_GAP = 8;

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

// ─── Transcript Shimmer ──────────────────────────────────
// Pulsing placeholder bars shown while AI cleans the transcript.
// Think of it like a skeleton loader — it shows the shape of text
// lines while the real content is being prepared behind the scenes.

// Shimmer bars sit directly on cream now (no card). They mimic
// a paragraph of Merriweather text — slightly taller than the
// old bars (matches transcript line-height) so the loading state
// has the same vertical mass as the real text that replaces it.
const SHIMMER_BARS = [
  { width: '100%' },
  { width: '85%' },
  { width: '60%' },
] as const;

function TranscriptShimmer() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={{ opacity, paddingVertical: spacing(2) }}>
      {SHIMMER_BARS.map((bar, i) => (
        <View
          key={i}
          style={{
            width: bar.width,
            height: 14,
            backgroundColor: colors.border,
            borderRadius: 4,
            marginBottom: i < SHIMMER_BARS.length - 1 ? 12 : 0,
          }}
        />
      ))}
    </Animated.View>
  );
}

// ─── Photo Thumb with loading skeleton ─────────────────────
//
// Shows a pulsing placeholder while an entry photo is being fetched
// and decoded. Without this the user sees a blank tile on slower
// networks for a noticeable beat — makes the app feel sluggish even
// when everything's actually working.
//
// Two failure modes we handle:
//   - No URL yet (storagePath exists, signed URL not resolved) → skeleton
//   - URL present but <Image> can't load (404, expired, network) → error icon
//
// The skeleton uses the same pulse pattern as TranscriptShimmer, keyed
// on the photo id so each thumb animates independently.

// Paper border inside the tilted frame — like a Polaroid mat.
const PHOTO_PAPER_BORDER = 6;

function PhotoThumb({
  uri,
  hasUri,
  size,
  onLongPress,
  tiltDeg,
}: {
  uri: string | undefined;
  hasUri: boolean;
  size: number;
  onLongPress?: () => void;
  tiltDeg: number;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (isLoaded) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.8, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [isLoaded, pulse]);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [uri]);

  const showSkeleton = !hasUri || (!isLoaded && !hasError);
  const innerSize = size - PHOTO_PAPER_BORDER * 2;

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={400}
      style={{
        width: size,
        height: size,
        padding: PHOTO_PAPER_BORDER,
        backgroundColor: colors.card,
        borderRadius: radii.sm,
        transform: [{ rotate: `${tiltDeg}deg` }],
        ...shadows.sm,
      }}
    >
      <View
        style={{
          width: innerSize,
          height: innerSize,
          overflow: 'hidden',
          backgroundColor: colors.bg,
        }}
      >
        {hasUri && uri && !hasError && (
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
          />
        )}
        {showSkeleton && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.card,
              opacity: pulse,
            }}
          />
        )}
        {hasError && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="image-outline" size={28} color={colors.textMuted} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Entry Detail Screen ──────────────────────────────────

export default function EntryDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // ─── Photo Grid Sizing ─────────────────────────────────
  //
  // useWindowDimensions() re-renders the component when the
  // viewport changes (browser resize, foldable unfolding, etc.)
  // so the photo size never gets "frozen" the way it did with
  // the old module-scope Dimensions.get() call.
  //
  // The Math.min(..., 420) cap keeps photos phone-sized when
  // previewing in a wide browser or on a tablet — without it,
  // a 1200px desktop window would size each thumb to ~580px
  // and break the layout.
  const { width: viewportWidth } = useWindowDimensions();
  const layoutWidth = Math.min(viewportWidth, 420);
  const photoThumbSize = (layoutWidth - 40 - PHOTO_GRID_GAP) / 2;

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
  const [isAiProcessing, setIsAiProcessing] = useState(false);
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
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  // Long-press a photo opens a confirmation; we hold the pending
  // photo id here so the existing ConfirmationDialog can act on it.
  const [pendingDeletePhotoId, setPendingDeletePhotoId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPhotoSaving, setIsPhotoSaving] = useState(false);
  const [showBanner, setShowBanner] = useState(!!params.audioUri);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Favorite animation — burst originates from the tap position
  const [favAnimOrigin, setFavAnimOrigin] = useState<{ x: number; y: number } | null>(null);

  // Banner auto-dismiss (built-in Animated, not Reanimated)
  const bannerOpacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

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

  // Ref to the inner ScrollView wrapping the transcript TextInput.
  // Wrapping the input in a ScrollView (rather than relying on the
  // TextInput's internal scroll) gives us a reliable scrollTo() across
  // platforms — the textarea-internal scroll on web ignores scrollTop
  // resets when the input isn't focused, so we control it directly.
  const transcriptScrollRef = useRef<ScrollView>(null);

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
        photoLocalUris: [],
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
          capture('entry_detail_viewed', { entryType: mapped.entryType });
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

          // Show shimmer on transcript area while AI cleans it up.
          // Only for voice entries — text entries show their content immediately.
          if (params.audioUri) setIsAiProcessing(true);

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

          // If AI was fast and title is already here, skip the fade-in
          // animation and clear the shimmer (transcript is already cleaned)
          if (mapped.title) {
            titleWasImmediate.current = true;
            setIsAiProcessing(false);
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

          // When AI finishes, patch title + cleaned transcript into state.
          // If AI was already fast (mapped.title exists), this is a no-op
          // since getEntry already returned the cleaned data above.
          aiPromise.then((result) => {
            if (cancelled) return;
            setIsAiProcessing(false);
            if (!result) return; // AI failed — raw transcript stays as fallback

            const updates: Partial<Entry> = {};

            if (result.title && !mapped.title) {
              updates.title = result.title;
            }

            if (result.cleaned_transcript) {
              updates.text = result.cleaned_transcript;
              // Only replace transcript if user hasn't started editing.
              // Compare against the raw text we originally received —
              // if they match, user hasn't touched it, safe to swap in
              // the cleaned version.
              setTranscript((current) => {
                const rawText = params.transcript || '';
                return current === rawText ? result.cleaned_transcript! : current;
              });
            }

            if (Object.keys(updates).length > 0) {
              setEntry((prev) => prev ? { ...prev, ...updates } : prev);
              updateEntryLocal(row.id, updates);
            }
          }).catch(() => {
            setIsAiProcessing(false);
          });
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

        // Only treat this as a network error if the device is actually offline.
        // Matching on error message text (e.g. "failed to fetch") produced false
        // positives for backend errors like a missing table relationship.
        if (!isOnlineRef.current) {
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
          setError('Something went wrong. Please try again.');
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

  // Resolve signed URLs for entry photos every time the screen gains focus.
  // Why useFocusEffect instead of useEffect: signed URLs expire after an
  // hour. If a user opens an entry, backgrounds the app for 2 hours, and
  // comes back, a mount-only effect would hold a dead URL and silently 403.
  // useFocusEffect re-runs on every focus (mount + returning from another
  // screen or the app background) — the cache inside handles the dedupe so
  // we aren't hammering Supabase when the URL is actually fresh.
  //
  // Keyed on entry?.id so switching entries triggers a fresh resolve.
  // Deliberately NOT keyed on entry?.photos to avoid an infinite loop —
  // the effect updates entry.photos, which would re-trigger itself.
  useFocusEffect(
    useCallback(() => {
      if (!entry?.photos || entry.photos.length === 0) return;
      const photosWithPath = entry.photos.filter((photo) => photo.storagePath);
      if (photosWithPath.length === 0) return;

      let cancelled = false;
      (async () => {
        const resolved = await Promise.all(
          entry.photos!.map(async (photo) => {
            const path = photo.storagePath;
            if (!path) return photo;
            try {
              // Pass familyId so getEntryMediaUrl skips its per-photo
              // entries.lookup (review fix #12 — the N+1 across cards).
              const signedUri = await getCachedPhotoUrl(
                path,
                (p) => storageService.getEntryMediaUrl(p, familyId ?? undefined),
              );
              return { ...photo, uri: signedUri, storagePath: path };
            } catch {
              return photo;
            }
          }),
        );

        if (cancelled) return;
        setEntry((prev) => prev ? { ...prev, photos: resolved } : prev);
        updateEntryLocal(entry.id, { photos: resolved });
      })();

      return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entry?.id]),
  );


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

  // ── Scroll-to-top on entry load ──
  // The transcript lives inside an inner ScrollView (capped at maxHeight)
  // so we can pin scroll to the top reliably on both native and web —
  // ScrollView.scrollTo is well-tested and doesn't depend on the input's
  // focus or cursor state. Re-runs when the transcript value changes
  // (e.g. AI processing finishes and replaces the raw transcript) so
  // long cleaned text also lands at the top, not scrolled to the end.
  useEffect(() => {
    if (!entry) return;
    const id = setTimeout(() => {
      transcriptScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 50);
    return () => clearTimeout(id);
  }, [entry?.id, transcript]);

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
  // Only updates local component state — Zustand store is updated
  // when the user taps the explicit Save button.
  const handleTitleChange = (text: string) => {
    const cleaned = text.replace(/\n/g, ' ');
    setEntry((prev) => prev ? { ...prev, title: cleaned } : prev);
    setHasUnsavedChanges(true);
  };

  // Updates local state immediately so typing feels instant.
  // Supabase is only updated when the user taps the Save button.
  const handleTranscriptChange = (text: string) => {
    setTranscript(text);
    setEntry((prev) => prev ? { ...prev, text } : prev);
    setHasUnsavedChanges(true);
  };

  // Explicit save — persists title + transcript to Supabase and
  // syncs the Zustand store so other screens see the update.
  const handleSave = async () => {
    if (!entry || isSaving) return;
    setIsSaving(true);
    try {
      await entriesService.update(entry.id, {
        title: entry.title || null,
        transcript: transcript,
      });
      updateEntryLocal(entry.id, { title: entry.title, text: transcript });
      setHasUnsavedChanges(false);
      setShowSavedConfirmation(true);
      setTimeout(() => setShowSavedConfirmation(false), 1500);
    } catch (err) {
      console.warn('Failed to save:', err);
      Alert.alert('Save failed', 'Your changes could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
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

  const handleAddPhoto = async () => {
    if (!entry || isPhotoSaving) return;
    if (!isOnline) {
      Alert.alert('No Internet', 'Photos can be added when you are back online.');
      return;
    }
    const currentPhotos = entry.photos ?? [];
    if (currentPhotos.length >= 2) {
      Alert.alert('Photo limit reached', 'You can attach up to 2 photos per memory.');
      return;
    }

    let ImagePicker: typeof import('expo-image-picker');
    try {
      ImagePicker = await import('expo-image-picker');
    } catch {
      Alert.alert(
        'Photo module unavailable',
        'Please reinstall dependencies and restart/rebuild the app to enable photo picking.',
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo Access Needed', 'Allow photo library access to add memory photos.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: (ImagePicker as any).MediaTypeOptions?.Images ?? ['images'],
      allowsEditing: true,
      quality: 1,
    });
    if (picked.canceled || !picked.assets[0]?.uri) return;

    setIsPhotoSaving(true);
    // Track the uploaded storage path so we can delete the orphan if the
    // DB insert fails after the file is already in the bucket. Each Supabase
    // call is its own transaction — without this rollback, a network blip
    // between upload and insert would leave a file with nothing pointing at it.
    let uploadedStoragePath: string | null = null;
    try {
      const asset = picked.assets[0];

      // Shrink + re-encode before upload. Metadata we store should match
      // the bytes actually in storage, so we use the compressed result.
      const compressed = await compressPhoto(asset.uri);

      const displayOrder = currentPhotos.length === 0
        ? 0
        : Math.max(...currentPhotos.map((photo, index) => photo.displayOrder ?? index)) + 1;
      const storagePath = await storageService.uploadEntryPhoto(entry.id, compressed.uri, displayOrder);
      uploadedStoragePath = storagePath;
      const mediaRow = await entriesService.addEntryPhoto(entry.id, {
        storage_path: storagePath,
        display_order: displayOrder,
        width: compressed.width,
        height: compressed.height,
        file_size_bytes: compressed.size,
      });
      // DB insert succeeded — the file is now referenced, clear the rollback marker.
      uploadedStoragePath = null;
      const signedUri = await storageService.getEntryMediaUrl(storagePath, familyId ?? undefined);
      const updatedPhotos = [
        ...currentPhotos,
        { id: mediaRow.id, uri: signedUri, storagePath, displayOrder },
      ];
      setEntry((prev) => prev ? { ...prev, photos: updatedPhotos } : prev);
      updateEntryLocal(entry.id, { photos: updatedPhotos });
    } catch (err) {
      if (uploadedStoragePath) {
        try {
          await storageService.deleteEntryMedia(uploadedStoragePath);
        } catch (cleanupErr) {
          // Don't mask the original failure — log and move on. The worst
          // case is one orphaned file, not a confusing double-error Alert.
          console.warn('Failed to clean up orphaned entry photo:', cleanupErr);
        }
      }
      const msg = err instanceof Error ? err.message : 'Could not add photo';
      Alert.alert('Add Photo Failed', msg);
    } finally {
      setIsPhotoSaving(false);
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    if (!entry || isPhotoSaving) return;
    const target = (entry.photos ?? []).find((photo) => photo.id === photoId);
    if (!target) return;

    setIsPhotoSaving(true);
    try {
      await entriesService.removeEntryPhoto(photoId);
      if (target.storagePath) {
        await storageService.deleteEntryMedia(target.storagePath);
      }
      const remaining = (entry.photos ?? []).filter((photo) => photo.id !== photoId);
      setEntry((prev) => prev ? { ...prev, photos: remaining } : prev);
      updateEntryLocal(entry.id, { photos: remaining });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not remove photo';
      Alert.alert('Remove Photo Failed', msg);
    } finally {
      setIsPhotoSaving(false);
    }
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
      capture('entry_deleted', { entryType: entry.entryType });
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing(10) }]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* Post-recording banner */}
        {showBanner && entry.hasAudio && (
          <Animated.View style={[styles.banner, { opacity: bannerOpacity }]}>
            <Ionicons name="heart" size={16} color={colors.accent} />
            <Text style={styles.bannerText}>Memory saved</Text>
          </Animated.View>
        )}

        {/* ── 1. Eyebrow row — child eyebrow (left) + italic dateline (right) ──
            Replaces the old gold gradient rule. The eyebrow tells you who
            and when in one quiet line above the title. */}
        <View style={styles.eyebrowRow}>
          <View style={styles.childEyebrow}>
            {entryChildren.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eyebrowScrollContent}
                style={styles.eyebrowScroll}
              >
                <View
                  style={[
                    styles.eyebrowDot,
                    {
                      backgroundColor:
                        childColors[entryChildren[0].colorIndex]?.hex ??
                        childColors[0].hex,
                    },
                  ]}
                />
                <Text style={styles.eyebrowFor}>FOR </Text>
                {entryChildren.map((child, i) => {
                  const hex =
                    childColors[child.colorIndex]?.hex ?? childColors[0].hex;
                  const isLast = i === entryChildren.length - 1;
                  // Single child: include age (e.g. "CHARLIE, 2Y 1M")
                  // Multi child: ampersand-join names only (e.g. "CHARLIE & EMMA")
                  const ageSuffix =
                    entryChildren.length === 1
                      ? `, ${getAge(child.birthday, entry.date).toUpperCase()}`
                      : '';
                  // Inner separator for 3+ kids: "CHARLIE, EMMA & SOPHIE"
                  const sep = isLast
                    ? ''
                    : i === entryChildren.length - 2
                      ? ' & '
                      : ', ';
                  return (
                    <Fragment key={child.id}>
                      <Text style={[styles.eyebrowName, { color: hex }]}>
                        {child.name.toUpperCase()}
                        {ageSuffix}
                      </Text>
                      {!!sep && (
                        <Text style={styles.eyebrowJoin}>{sep}</Text>
                      )}
                    </Fragment>
                  );
                })}
              </ScrollView>
            )}
            {hasAccess && !allChildrenTagged && (
              <Pressable
                onPress={() => setShowChildPicker(!showChildPicker)}
                hitSlop={hitSlop.icon}
                style={({ pressed }) => [
                  styles.eyebrowAdd,
                  entryChildren.length > 0 && { marginLeft: spacing(2) },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Ionicons name="add" size={14} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => hasAccess && setShowDatePicker(true)}
            disabled={!hasAccess}
            hitSlop={hitSlop.icon}
          >
            <Text style={styles.dateline}>
              {formatDate(entry.date, 'long').toLowerCase()}
            </Text>
          </Pressable>
        </View>

        {/* ── 2. Title — the hero element. Hierarchy lives here, not in a rule. ── */}
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

        {/* ── 3. Caption row — quiet time + location below the title ── */}
        <View style={styles.captionRow}>
          <Pressable
            onPress={() => hasAccess && setShowDatePicker(true)}
            disabled={!hasAccess}
          >
            <Text style={styles.captionText}>
              {formatTime(entry.createdAt ?? entry.date)}
            </Text>
          </Pressable>
          {entry.locationText ? (
            <Pressable
              onPress={() => hasAccess && setEditingLocation(true)}
              disabled={!hasAccess}
            >
              <Text style={styles.captionText}> · {entry.locationText}</Text>
            </Pressable>
          ) : hasAccess && permissionGranted && !editingLocation ? (
            <Pressable onPress={() => setEditingLocation(true)}>
              <Text style={styles.captionLocationAdd}> · + add location</Text>
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

        {/* ── 4. Transcript — capped soft card with internal scroll so
            photos below stay visible above the fold on long entries. */}
        {isAiProcessing ? (
          <TranscriptShimmer />
        ) : (
          <>
            {isVoiceEntry && !transcript && (
              <View style={styles.transcriptHint}>
                <Ionicons name="create-outline" size={14} color={colors.textMuted} />
                <Text style={styles.transcriptHintText}>
                  No speech detected — type your memory below
                </Text>
              </View>
            )}
            <View style={styles.transcriptCard}>
              <ScrollView
                ref={transcriptScrollRef}
                style={styles.transcriptScroll}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  style={styles.transcriptInput}
                  value={transcript}
                  onChangeText={handleTranscriptChange}
                  placeholder="Start typing your memory..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  textAlignVertical="top"
                  scrollEnabled={false}
                  editable={hasAccess}
                  autoCapitalize="sentences"
                />
              </ScrollView>
            </View>
            {showSavedConfirmation && (
              <View style={styles.savedConfirmation}>
                <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                <Text style={styles.savedConfirmationText}>Saved</Text>
              </View>
            )}
          </>
        )}

        {/* ── 5. Audio — voice entries only. Hidden entirely for text-only entries.
            Locked state (non-subscriber) is a quiet inline row, not a card.
            The play button is the one that matters; re-record / append
            move into a small ellipsis menu so they don't compete visually. */}
        {isVoiceEntry && !hasAccess && (
          <>
            <Text style={styles.sectionEyebrow}>IN YOUR VOICE</Text>
            <View style={styles.audioLocked}>
              <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
              <Text style={styles.audioLockedText}>subscribe to play audio</Text>
            </View>
          </>
        )}
        {isVoiceEntry && hasAccess && (
          <>
            <Text style={styles.sectionEyebrow}>IN YOUR VOICE</Text>
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

              {!audioHasError && !audioMissing && (
                <Text style={styles.audioDuration}>
                  {audioIsLoading
                    ? 'Loading...'
                    : player.duration > 0
                      ? formatDuration(player.isPlaying ? player.position : player.duration, true)
                      : '--:--'}
                </Text>
              )}

              {/* Overflow menu — re-record + append demoted from inline buttons.
                  The play button is the one that matters; everything else
                  hides behind a single dot menu. */}
              {!audioIsLoading && (
                <Pressable
                  onPress={() => setShowAudioMenu(true)}
                  hitSlop={hitSlop.icon}
                  style={({ pressed }) => [styles.audioMenuBtn, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSoft} />
                </Pressable>
              )}
            </View>
          </>
        )}

        {/* ── 6. Photos — Polaroid-style scrapbook tiles. Up to 2 per entry.
            Long-press to remove (no inline ×s); the photos read as kept,
            not uploaded. The "SNAPSHOTS FROM THE DAY" eyebrow only shows
            when there's at least one photo. */}
        {entry.photos && entry.photos.length > 0 && (
          <View style={styles.photoSection}>
            <Text style={styles.sectionEyebrow}>SNAPSHOTS FROM THE DAY</Text>
            <View style={styles.photoGrid}>
              {entry.photos.slice(0, 2).map((photo, index) => {
                // Only treat the uri as usable when it's a signed http URL.
                // Local file uris from the picker are shown inline during
                // upload but the actual storage-backed uri lands later.
                const hasUri = !!photo.uri && photo.uri.startsWith('http');
                // Deterministic alternating tilt: photo 0 leans left,
                // photo 1 leans right. Same value across renders so the
                // tilt feels intentional, not jittery.
                const tiltDeg = index === 0 ? -1.5 : 1.5;
                return (
                  <PhotoThumb
                    key={photo.id ?? index}
                    uri={hasUri ? photo.uri : undefined}
                    hasUri={hasUri}
                    size={photoThumbSize}
                    tiltDeg={tiltDeg}
                    onLongPress={
                      hasAccess && !isPhotoSaving
                        ? () => setPendingDeletePhotoId(photo.id)
                        : undefined
                    }
                  />
                );
              })}
            </View>
            {hasAccess && entry.photos.length < 2 && (
              <Pressable
                style={({ pressed }) => [
                  styles.addPhotoBtn,
                  pressed && { opacity: 0.6 },
                ]}
                onPress={handleAddPhoto}
                disabled={isPhotoSaving}
              >
                <Text style={styles.addPhotoBtnText}>
                  {isPhotoSaving ? 'Saving photo…' : 'Add a photo'}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Empty-state add-photo button — shows when no photos yet.
            No eyebrow above an empty section: the page stays quiet
            until you've actually kept something. */}
        {hasAccess && (!entry.photos || entry.photos.length === 0) && (
          <Pressable
            style={({ pressed }) => [
              styles.addPhotoBtn,
              styles.addPhotoBtnEmpty,
              pressed && { opacity: 0.6 },
            ]}
            onPress={handleAddPhoto}
            disabled={isPhotoSaving}
          >
            <Text style={styles.addPhotoBtnText}>
              {isPhotoSaving ? 'Saving photo…' : 'Add a photo'}
            </Text>
          </Pressable>
        )}

        {/* ── 7. Tags — footnote styling at the very bottom.
            On the page, pills are clean (no inline ×). To remove or
            add tags, tap "+ add tag" — the editor card shows ×s
            inside its own context. The TAGS eyebrow only appears
            when there's at least one tag to label. */}
        {entry.tags.length > 0 && (
          <Text style={styles.sectionEyebrow}>TAGS</Text>
        )}
        <View style={styles.tagsRow}>
          {entry.tags.map((tag) => (
            <TagPill key={tag} label={tag} variant="muted" />
          ))}
          {hasAccess && (
            <Pressable
              onPress={() => setShowTagEditor(!showTagEditor)}
              style={styles.addTagPill}
            >
              <Text style={styles.addTagPillText}>
                {entry.tags.length > 0 ? '+ add tag' : '+ add tags'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Tag Editor — the single place where × on tags lives.
            Showing the current tags here with × keeps removal one
            tap away without cluttering the main page. */}
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
              {entry.tags.length > 0 && (
                <>
                  <Text style={styles.frequentLabel}>On This Memory</Text>
                  <View style={[styles.frequentRow, { marginBottom: spacing(3) }]}>
                    {entry.tags.map((tag) => (
                      <TagPill
                        key={tag}
                        label={tag}
                        variant="muted"
                        onRemove={() => handleRemoveTag(tag)}
                      />
                    ))}
                  </View>
                </>
              )}
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

        {/* ── 8. Footer — quiet brand benediction. Closes every saved
            memory the same way: a soft restatement of the promise. ── */}
        {entry.id && entry.createdAt && (
          <Text style={styles.footerLine}>
            kept forever · saved {formatDate(entry.createdAt, 'long').toLowerCase()}
          </Text>
        )}
      </ScrollView>

      {/* ── Floating Save pill — appears only when there are unsaved
          edits. Doesn't disrupt the page's typography flow. ── */}
      {hasUnsavedChanges && (
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.saveFloating,
            { bottom: insets.bottom + spacing(4) },
            pressed && { opacity: 0.85 },
            isSaving && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.saveFloatingText}>
            {isSaving ? 'Saving…' : 'Save'}
          </Text>
        </Pressable>
      )}

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

      {/* Photo delete confirmation — fires after a long-press on a thumb */}
      <ConfirmationDialog
        visible={pendingDeletePhotoId !== null}
        title="Remove this photo?"
        body="The photo is removed from this memory."
        confirmLabel="Remove"
        onConfirm={() => {
          if (pendingDeletePhotoId) {
            handleRemovePhoto(pendingDeletePhotoId);
          }
          setPendingDeletePhotoId(null);
        }}
        onCancel={() => setPendingDeletePhotoId(null)}
      />

      {/* Audio overflow menu — re-record + append, hidden behind a dot menu
          so they don't compete with the play button visually. */}
      <Modal
        visible={showAudioMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAudioMenu(false)}
      >
        <Pressable
          style={styles.audioMenuOverlay}
          onPress={() => setShowAudioMenu(false)}
        >
          <Pressable onPress={() => {}} style={styles.audioMenuCard}>
            <Pressable
              onPress={() => {
                setShowAudioMenu(false);
                setShowReRecordDialog(true);
              }}
              style={({ pressed }) => [
                styles.audioMenuRow,
                pressed && { backgroundColor: colors.tag },
              ]}
            >
              <Ionicons name="mic-outline" size={18} color={colors.accent} />
              <Text style={styles.audioMenuRowText}>Re-record</Text>
            </Pressable>
            <View style={styles.audioMenuDivider} />
            <Pressable
              onPress={() => {
                setShowAudioMenu(false);
                if (player.duration >= MAX_RECORDING_DURATION_MS) {
                  Alert.alert(
                    'This memory is full',
                    'Recordings can be up to three minutes. You can record again to start fresh.',
                  );
                } else {
                  setShowAppendDialog(true);
                }
              }}
              style={({ pressed }) => [
                styles.audioMenuRow,
                pressed && { backgroundColor: colors.tag },
                player.duration >= MAX_RECORDING_DURATION_MS && { opacity: 0.4 },
              ]}
            >
              <Ionicons name="add-outline" size={18} color={colors.accent} />
              <Text style={styles.audioMenuRowText}>Append</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
    </KeyboardAvoidingView>
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
    textAlign: 'center',
    paddingHorizontal: spacing(6),
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
    paddingBottom: spacing(1),
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
    fontSize: 26,
    color: colors.text,
    lineHeight: 33,
    textAlign: 'left',
    letterSpacing: -0.3,
    marginBottom: spacing(2),
  },
  // ─── Eyebrow row (above title) ──────
  // Quiet pre-title row: child eyebrow on the left, italic
  // dateline on the right. Replaces the old gold gradient rule.
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing(1),
    marginBottom: spacing(2),
    minHeight: 18,
  },
  childEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  eyebrowScroll: {
    flexShrink: 1,
  },
  eyebrowScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing(2),
  },
  eyebrowFor: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  eyebrowName: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  eyebrowJoin: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  eyebrowAdd: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateline: {
    fontSize: 13,
    // System italic — Merriweather Italic isn't loaded, and
    // synthesized italic clips glyphs on Android.
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  // ─── Caption row (below title) ───────
  // Time + optional location, sized small enough to read as
  // metadata, large enough to tap for editing.
  captionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: spacing(3),
    minHeight: 20,
  },
  captionText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  captionLocationAdd: {
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
  // ─── Section Eyebrows ────────────────
  // Uppercase labels that interlock the four sections of the
  // entry into one continuous page. Quiet by design — present
  // enough to organize, soft enough to stay out of the way.
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing(5),
    marginBottom: spacing(2),
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
    marginTop: spacing(4),
    marginBottom: spacing(4),
  },
  addTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.tag,
  },
  addTagPillText: {
    fontSize: 11,
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
  // ─── Transcript (flows directly on cream — no card) ──
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    marginTop: spacing(1),
  },
  transcriptScroll: {
    maxHeight: 208,
  },
  transcriptInput: {
    ...typography.transcript,
    lineHeight: 26,
    color: colors.text,
    minHeight: 120,
    paddingVertical: 0,
  },
  savedConfirmation: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing(2),
    marginBottom: spacing(2),
  },
  savedConfirmationText: {
    ...typography.caption,
    color: colors.accent,
  },
  // ─── Floating Save pill (only when unsaved edits) ──
  saveFloating: {
    position: 'absolute',
    right: spacing(5),
    backgroundColor: colors.accent,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(5),
    borderRadius: radii.full,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  saveFloatingText: {
    ...typography.buttonLabel,
    color: colors.card,
  },
  // ─── Photo Grid ──────────────────────
  photoSection: {
    marginBottom: spacing(2),
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PHOTO_GRID_GAP,
    // Tilted thumbs extend slightly past their bounding box at
    // the corners — a few pixels of vertical breathing room
    // keeps the corners from clipping into neighboring sections.
    paddingVertical: spacing(2),
  },
  // Full-width "Add a photo" button — bordered, italic, scrapbook-y.
  // Hides when the entry already has 2 photos.
  addPhotoBtn: {
    marginTop: spacing(3),
    paddingVertical: spacing(3),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  addPhotoBtnEmpty: {
    marginTop: spacing(5),
  },
  addPhotoBtnText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: colors.textSoft,
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
  // ─── Audio overflow menu ─────────────
  // Single dot menu that hides re-record + append. The play
  // button is the one that matters; everything else gets out
  // of its way.
  audioMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
  },
  audioMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44,36,32,0.45)',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(8),
  },
  audioMenuCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.lg,
  },
  audioMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(5),
    minHeight: minTouchTarget,
  },
  audioMenuRowText: {
    ...typography.formLabel,
    color: colors.text,
  },
  audioMenuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  // ─── Footer benediction ──────────────
  // Quiet italic line that closes every saved memory the same
  // way: a soft restatement of the brand promise.
  footerLine: {
    fontSize: 13,
    // No Merriweather Italic loaded — see addPhotoBtnText.
    // Use system italic to avoid Android glyph clipping.
    fontStyle: 'italic',
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing(8),
    marginBottom: spacing(4),
  },
});
