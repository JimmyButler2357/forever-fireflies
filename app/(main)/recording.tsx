import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  StyleSheet,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import {
  colors,
  fonts,
  typography,
  spacing,
  radii,
  hitSlop,
  minTouchTarget,
} from '@/constants/theme';
import { useEntriesStore } from '@/stores/entriesStore';
import { entriesService } from '@/services/entries.service';
import { storageService } from '@/services/storage.service';
import { audioCleanupService } from '@/services/audioCleanup.service';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { formatDuration } from '@/lib/dateUtils';
import { useLocation } from '@/hooks/useLocation';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { concatWavFiles, getWavDurationSeconds } from '@/lib/audioConcat';
import ErrorState from '@/components/ErrorState';
import WarmGlow from '@/components/WarmGlow';
import { useSubscription } from '@/hooks/useSubscription';

// ─── Recording Screen ─────────────────────────────────────

export default function RecordingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Defense-in-depth: if the user somehow reaches this screen without access
  // (e.g. deep link, bookmark, or back-nav), send them back to Home.
  // The mic button is already hidden on Home, but this is a safety net.
  // NOTE: This hook must be called here (not after a conditional return)
  // because React requires hooks to run in the same order every render.
  const { hasAccess } = useSubscription();

  const { reRecordEntryId, appendEntryId, appendStoragePath, appendTranscript, onboarding, fromNotification } = useLocalSearchParams<{
    reRecordEntryId?: string;
    appendEntryId?: string;
    appendStoragePath?: string;
    appendTranscript?: string;
    onboarding?: string;
    fromNotification?: string;
  }>();
  const isReRecord = !!reRecordEntryId;
  const isAppend = !!appendEntryId;

  const updateEntryLocal = useEntriesStore((s) => s.updateEntryLocal);

  // Real speech recognition — captures audio + live transcript
  const speech = useSpeechRecognition();

  // Check mic permission on mount so we can show the denied
  // screen immediately instead of waiting for auto-start.
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'checking'>('checking');

  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptScrollRef = useRef<ScrollView>(null);

  // Tracks when we've called stop() but speech hasn't finalized yet.
  const [isStopping, setIsStopping] = useState(false);

  // Shows a brief "too short" message when user stops immediately
  const [tooShortMessage, setTooShortMessage] = useState(false);

  // Append mode: download existing audio in the background while the
  // user records. Think of it like ordering pizza while you cook the
  // sides — both happen at the same time so everything's ready faster.
  const existingAudioRef = useRef<Promise<string> | null>(null);
  const existingAudioUriRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAppend || !appendStoragePath) return;
    // Start downloading immediately — don't wait for recording to finish
    const downloadPromise = storageService.downloadAudio(appendStoragePath)
      .then((uri) => {
        existingAudioUriRef.current = uri;
        return uri;
      });
    existingAudioRef.current = downloadPromise;
  }, [isAppend, appendStoragePath]);

  // Breathing circle animation (built-in Animated, not Reanimated)
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.12)).current;

  const { locationText } = useLocation();

  // Refs for the navigate-after-stop effect — keep them after
  // the hooks above so the initial values are defined.
  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;
  const speechRef = useRef(speech);
  speechRef.current = speech;
  const locationTextRef = useRef(locationText);
  locationTextRef.current = locationText;
  const reduceMotion = useReduceMotion();

  // Prevents auto-start from firing more than once
  const hasAutoStarted = useRef(false);

  // Redirect to Home if the user doesn't have access.
  // Placed AFTER all hooks to satisfy React's rules of hooks.
  useEffect(() => {
    if (!hasAccess) {
      router.replace('/(main)/home');
    }
  }, [hasAccess]);

  if (!hasAccess) return null;

  // ─── Permission Check ──────────────────────────────────
  //
  // On mount, ask the OS whether mic access was already
  // granted or permanently denied. If "canAskAgain" is true,
  // we let the hook request permission when auto-start fires.

  useEffect(() => {
    ExpoSpeechRecognitionModule.getPermissionsAsync()
      .then((result) => {
        if (result.granted) {
          setMicPermission('granted');
        } else if (!result.canAskAgain) {
          // Permanently denied — show the "open settings" screen
          setMicPermission('denied');
        } else {
          // Not yet decided — the hook will prompt when auto-start fires
          setMicPermission('granted');
        }
      })
      .catch(() => {
        // Can't check? Assume ok — hook will handle errors
        setMicPermission('granted');
      });
  }, []);

  // ─── Auto-Start Recording on Mount ────────────────────
  //
  // Once mic permission resolves to 'granted', we immediately
  // begin recording. No extra tap needed — like a voice recorder
  // app where pressing the button starts it rolling.

  useEffect(() => {
    if (micPermission !== 'granted' || hasAutoStarted.current) return;
    hasAutoStarted.current = true;
    handleStart();
  }, [micPermission]);

  // If the hook reports a permission error, show the denied screen
  useEffect(() => {
    if (speech.error) {
      if (speech.error.toLowerCase().includes('permission')) {
        setMicPermission('denied');
      }
    }
  }, [speech.error]);

  // Start breathing animation when recording begins
  useEffect(() => {
    if (speech.isRecording) {
      if (reduceMotion) return;

      // Breathe: scale 1 -> 1.15 -> 1
      Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.15,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // Ring pulse: scale 1 -> 1.7, opacity 0.12 -> 0
      Animated.loop(
        Animated.parallel([
          Animated.timing(ringAnim, {
            toValue: 1.7,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [speech.isRecording]);

  // Freeze/resume animations when paused.
  // When paused, we stop all animations and snap to resting values
  // so the visual "breathing" effect halts — like holding your breath.
  // When unpaused, we restart the loops.
  useEffect(() => {
    if (!speech.isRecording || reduceMotion) return;

    if (speech.isPaused) {
      // Freeze: stop animations and snap to resting state
      breatheAnim.stopAnimation();
      ringAnim.stopAnimation();
      ringOpacity.stopAnimation();
      breatheAnim.setValue(1);
      ringAnim.setValue(1);
      ringOpacity.setValue(0);
    } else {
      // Resume: restart the breathing + ring animations
      Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.15,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      Animated.loop(
        Animated.parallel([
          Animated.timing(ringAnim, {
            toValue: 1.7,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [speech.isPaused]);

  // Timer — only ticks when actively recording (not paused).
  // When paused, the interval is cleared so the user keeps
  // their full 60 seconds of speaking time.
  useEffect(() => {
    if (speech.isRecording && !speech.isPaused) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [speech.isRecording, speech.isPaused]);

  // Auto-stop at 60 seconds
  useEffect(() => {
    if (seconds >= 60) {
      handleStop();
    }
  }, [seconds]);

  // ─── Navigate After Speech Finishes ────────────────────
  //
  // When the user taps stop, we set isStopping=true and call
  // speech.stop(). The speech engine takes a moment to
  // finalize the transcript + save the audio file. Once
  // speech.isRecording flips to false, everything is ready —
  // we create the entry and navigate.

  useEffect(() => {
    if (!isStopping || speech.isRecording) return;

    // Read latest values from refs to avoid stale closures.
    const s = speechRef.current;
    const secs = secondsRef.current;
    const loc = locationTextRef.current;

    // If we have a transcript but no audio yet, concatenation is
    // still in progress — wait for audioUri to be set.
    if (!s.audioUri && !s.transcript) return;

    // ── Edge case: Empty recording ──
    //
    // If the user tapped stop immediately (less than 2 seconds),
    // there's nothing useful to save. Show a brief message then
    // auto-restart so they can try again without navigating.
    if (secs < 2 && !s.transcript) {
      setIsStopping(false);
      setSeconds(0);
      setTooShortMessage(true);
      setTimeout(() => {
        setTooShortMessage(false);
        handleStart();
      }, 3000);
      return;
    }

    if (isAppend && appendEntryId) {
      // Append: concatenate new audio onto the existing recording,
      // then append the new transcript below the original.
      (async () => {
        try {
          // Wait for the background download that started on mount.
          // It's likely already finished by now since the user was
          // recording while it downloaded.
          const existingUri = await existingAudioRef.current;
          if (!existingUri || !s.audioUri) {
            console.warn('Append failed — missing audio files');
            router.back();
            return;
          }

          // Stitch old + new audio into one WAV file
          const combinedUri = await concatWavFiles([existingUri, s.audioUri]);

          // Upload the combined file (upsert overwrites the original)
          await storageService.uploadAudio(appendEntryId, combinedUri);

          // Get the combined duration for the DB
          const combinedDuration = await getWavDurationSeconds(combinedUri);

          // Build the combined transcript: original, blank line, new text
          const combinedTranscript = appendTranscript
            ? appendTranscript + '\n\n' + (s.transcript || '')
            : s.transcript || '';

          // Update the entry in Supabase
          await entriesService.update(appendEntryId, {
            transcript: combinedTranscript,
            audio_duration_seconds: Math.round(combinedDuration),
          });

          // Update local cache so the UI reflects changes immediately
          updateEntryLocal(appendEntryId, {
            text: combinedTranscript,
            hasAudio: true,
          });

          // Re-run AI so the title reflects the combined content
          entriesService.processWithAI(appendEntryId).catch(() => {});

          // Clean up all temp files
          audioCleanupService.deleteLocalFile(existingUri);
          audioCleanupService.deleteLocalFile(s.audioUri);
          audioCleanupService.deleteLocalFile(combinedUri);
        } catch (err) {
          console.warn('Append save failed:', err);
        }
        router.back();
      })();
    } else if (isReRecord && reRecordEntryId) {
      // Re-record: update existing entry's audio + transcript
      // via Supabase, then go back to the entry detail screen.
      (async () => {
        try {
          // Upload the new audio file (upsert overwrites the old one)
          if (s.audioUri) {
            await storageService.uploadAudio(reRecordEntryId, s.audioUri);
            // Clean up local .wav after successful upload
            await audioCleanupService.deleteLocalFile(s.audioUri);
          }
          // Update the transcript in the database
          await entriesService.update(reRecordEntryId, {
            transcript: s.transcript || '',
          });
          // Update local cache too
          updateEntryLocal(reRecordEntryId, {
            text: s.transcript || '',
            hasAudio: true,
          });
          // Re-run AI with the new transcript so the title stays fresh
          entriesService.processWithAI(reRecordEntryId).catch(() => {});
        } catch (err) {
          console.warn('Re-record save failed:', err);
        }
        router.back();
      })();
    } else {
      // Normal: navigate to entry-detail with the transcript
      // and audioUri. Entry-detail will create the Supabase
      // entry and upload the audio itself.
      router.replace({
        pathname: '/(main)/entry-detail',
        params: {
          transcript: s.transcript,
          audioUri: s.audioUri ?? '',
          locationText: loc ?? '',
          onboarding: onboarding ?? '',
          fromNotification: fromNotification ?? '',
        },
      });
    }

    setIsStopping(false);
  }, [isStopping, speech.isRecording, speech.audioUri]);

  // ─── Start / Stop Handlers ─────────────────────────────

  const handleStart = useCallback(async () => {
    setSeconds(0);
    speech.reset(); // Clear any previous error or transcript
    await speech.start();
    // The hook fires a 'start' event -> speech.isRecording = true.
    // If permission is denied, speech.error gets set instead.
  }, [speech]);

  const handleStop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    speech.stop();
    setIsStopping(true);
  }, [speech]);

  // Clean up if the user navigates away mid-recording
  useEffect(() => {
    return () => {
      speech.stop();
      // If we downloaded existing audio for append mode, clean it up
      if (existingAudioUriRef.current) {
        audioCleanupService.deleteLocalFile(existingAudioUriRef.current);
      }
    };
  }, []);


  // Mic permission denied — show friendly error
  if (micPermission === 'denied') {
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top + spacing(3) }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={hitSlop.icon}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
        <ErrorState
          icon="mic-off-outline"
          title="Microphone access needed"
          body="Forever Fireflies needs mic access to record your voice. You can enable it in your device settings."
          actionLabel="Open Settings"
          onAction={() => Linking.openSettings()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Warm radial gradient backdrop */}
      <WarmGlow />

      {/* Top bar: X on left, prompt toggle on right */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing(3) }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={hitSlop.icon}
          style={({ pressed }) => [
            styles.closeBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>

      </View>

      {/* Recording area */}
      <View style={[styles.recordingArea, { paddingBottom: insets.bottom + spacing(12) }]}>
        {speech.isRecording && (
          <>
            {/* Timer */}
            <Text style={styles.timer}>{formatDuration(seconds)}</Text>
            <Text style={styles.timerHint}>
              {speech.isPaused
                ? 'Paused'
                : seconds < 5
                  ? 'Recording...'
                  : `${60 - seconds}s remaining`}
            </Text>

            {/* Live transcript — updates in real-time as you speak */}
            <ScrollView
              ref={transcriptScrollRef}
              style={styles.transcriptScroll}
              contentContainerStyle={styles.transcriptContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                transcriptScrollRef.current?.scrollToEnd({ animated: true });
              }}
            >
              <Text style={speech.transcript ? styles.liveTranscript : styles.transcriptPlaceholder}>
                {speech.transcript || 'Start speaking...'}
              </Text>
            </ScrollView>
          </>
        )}

        {/* Breathing circle + ring pulse (recording only) */}
        <View style={styles.micWrapper}>
          {speech.isRecording && (
            <>
              {/* Expanding ring */}
              <Animated.View
                style={[
                  styles.ring,
                  {
                    transform: [{ scale: ringAnim }],
                    opacity: ringOpacity,
                  },
                ]}
              />
              {/* Breathing circle */}
              <Animated.View
                style={[
                  styles.breatheCircle,
                  { transform: [{ scale: breatheAnim }] },
                ]}
              />
            </>
          )}

          {/* Stop + Pause buttons (visible while recording) */}
          {speech.isRecording && (
            <View style={styles.recordingButtons}>
              {/* Small side button — Pause (when recording) or Stop (when paused) */}
              <Pressable
                onPress={speech.isPaused ? handleStop : speech.pause}
                style={({ pressed }) => [
                  styles.pauseButton,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Ionicons
                  name={speech.isPaused ? 'square' : 'pause'}
                  size={speech.isPaused ? 16 : 22}
                  color={colors.text}
                />
              </Pressable>

              {/* Big center button — Stop (when recording) or Resume (when paused) */}
              <Pressable
                onPress={speech.isPaused ? speech.resume : handleStop}
                style={({ pressed }) => [
                  styles.stopButton,
                  speech.isPaused && styles.resumeButton,
                  pressed && { opacity: 0.85 },
                ]}
              >
                {speech.isPaused ? (
                  <Ionicons name="play" size={32} color={colors.card} />
                ) : (
                  <View style={styles.stopIcon} />
                )}
              </Pressable>

              {/* Ghost spacer — same width as pause button to keep stop centered */}
              <View style={styles.pauseButtonSpacer} />
            </View>
          )}
        </View>

        {tooShortMessage && (
          <Text style={styles.errorHint}>Recording too short — try again</Text>
        )}
        {speech.error && !speech.error.toLowerCase().includes('permission') && (
          <Text style={styles.errorHint}>Something went wrong — try again</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // ─── Top Bar ────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(5),
  },
  closeBtn: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─── Recording Area ─────────────────
  recordingArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing(12),
    gap: spacing(4),
  },
  timer: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.text,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  timerHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  micWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
  },
  ring: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  breatheCircle: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accentGlow,
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 3,
    zIndex: 1,
  },
  resumeButton: {
    borderRadius: radii.full,
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 3,
    backgroundColor: colors.card,
  },
  recordingButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(5),
    zIndex: 1,
  },
  pauseButton: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButtonSpacer: {
    width: 48,
    height: 48,
  },
  errorHint: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '500',
  },
  // ─── Live Transcript ──────────────────
  transcriptScroll: {
    maxHeight: 120,
    width: '100%',
    paddingHorizontal: spacing(5),
  },
  transcriptContent: {
    paddingVertical: spacing(2),
  },
  liveTranscript: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  transcriptPlaceholder: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
