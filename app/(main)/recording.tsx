import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  screenColors,
  hitSlop,
  minTouchTarget,
} from '@/constants/theme';
import { useChildrenStore } from '@/stores/childrenStore';
import { useEntriesStore } from '@/stores/entriesStore';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useLocation } from '@/hooks/useLocation';
import ErrorState from '@/components/ErrorState';
import PaperTexture from '@/components/PaperTexture';

// ─── Prompt Bank ──────────────────────────────────────────

const PROMPTS = [
  "What's something they said today that made you smile?",
  "Any new words or phrases lately?",
  "What made them laugh the hardest today?",
  "What were they really focused on today?",
  "Did they do anything that surprised you?",
  "What's their current favorite thing?",
  "How did bedtime go tonight?",
  "What did they pretend to be today?",
  "Any new friendships or interactions?",
  "What question did they ask that stumped you?",
  "What's something small you don't want to forget?",
  "How did they show kindness today?",
  "What new skill are they working on?",
  "What was the funniest moment of the day?",
  "What did they eat that they actually liked?",
];

// Show 3 random prompts each time
function pickPrompts(count: number): string[] {
  const shuffled = [...PROMPTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ─── Recording Screen ─────────────────────────────────────

export default function RecordingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const children = useChildrenStore((s) => s.children);
  const addEntry = useEntriesStore((s) => s.addEntry);

  // Mic permission — defaults to 'granted' for prototype.
  // Phase 3 will replace this with a real Audio.getPermissionsAsync() check.
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'checking'>('granted');

  const [state, setState] = useState<'prompts' | 'recording'>('prompts');
  const [seconds, setSeconds] = useState(0);
  const [prompts] = useState(() => pickPrompts(3));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Breathing circle animation (built-in Animated, not Reanimated)
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.12)).current;
  const promptOpacity = useRef(new Animated.Value(1)).current;

  const { locationText } = useLocation();
  const firstName = children.length > 0 ? children[0].name : 'your child';
  const reduceMotion = useReduceMotion();

  // Start breathing animation
  useEffect(() => {
    if (state === 'recording') {
      if (reduceMotion) {
        // Skip decorative animations — jump to final states
        promptOpacity.setValue(0);
        return;
      }

      // Breathe: scale 1 → 1.15 → 1
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

      // Ring pulse: scale 1 → 1.7, opacity 0.12 → 0
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

      // Fade out prompts
      Animated.timing(promptOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [state]);

  // Timer
  useEffect(() => {
    if (state === 'recording') {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // Auto-stop at 60 seconds
  useEffect(() => {
    if (seconds >= 60) {
      handleStop();
    }
  }, [seconds]);

  const handleStart = () => {
    setState('recording');
    setSeconds(0);
  };

  const handleStop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Create mock entry from "recording"
    addEntry({
      text: `${firstName} did something amazing today. I was watching and couldn't help but smile. These little moments are everything.`,
      date: new Date().toISOString(),
      childIds: children.length > 0 ? [children[0].id] : [],
      tags: [],
      isFavorited: false,
      hasAudio: true,
      locationText: locationText ?? undefined,
    });

    router.push('/(main)/entry-detail');
  }, [children, firstName, locationText]);

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

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
          body="Core Memories needs mic access to record your voice. You can enable it in your device settings."
          actionLabel="Open Settings"
          onAction={() => {
            // Phase 3 will use Linking.openSettings()
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Warm radial gradient backdrop */}
      <View style={styles.gradientBackdrop} />

      {/* Top bar: just an X */}
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

      {/* Prompt cards — fade out during recording */}
      <Animated.View style={[styles.promptArea, { opacity: promptOpacity }]}>
        {state === 'prompts' && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.promptScroll}
          >
            {prompts.map((prompt, i) => (
              <View key={i} style={styles.promptCard}>
                <PaperTexture radius={radii.card} />
                <Text style={styles.promptText}>{prompt}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>

      {/* Recording area */}
      <View style={[styles.recordingArea, { paddingBottom: insets.bottom + spacing(12) }]}>
        {state === 'recording' && (
          <>
            {/* Timer */}
            <Text style={styles.timer}>{formatTimer(seconds)}</Text>
            <Text style={styles.timerHint}>
              {seconds < 5 ? 'Recording...' : `${60 - seconds}s remaining`}
            </Text>
          </>
        )}

        {/* Breathing circle + ring pulse (recording only) */}
        <View style={styles.micWrapper}>
          {state === 'recording' && (
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

          {/* Mic button (prompts mode) / Stop button (recording mode) */}
          {state === 'prompts' ? (
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.micButton,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="mic" size={42} color={colors.card} />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleStop}
              style={({ pressed }) => [
                styles.stopButton,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.stopIcon} />
            </Pressable>
          )}
        </View>

        {state === 'prompts' && (
          <Text style={styles.micHint}>Tap to start recording</Text>
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
  gradientBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: screenColors.recordingBackdrop,
    opacity: 0.5,
  },
  // ─── Top Bar ────────────────────────
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing(5),
  },
  closeBtn: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─── Prompts ────────────────────────
  promptArea: {
    flex: 1,
    paddingHorizontal: spacing(5),
  },
  promptScroll: {
    paddingTop: spacing(4),
    gap: spacing(3),
    paddingBottom: spacing(4),
  },
  promptCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: 20,
    paddingHorizontal: 24,
    ...shadows.promptCard,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  promptText: {
    ...typography.promptCard,
    color: colors.text,
  },
  // ─── Recording Area ─────────────────
  recordingArea: {
    alignItems: 'center',
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
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  breatheCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accentGlow,
  },
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 4,
    zIndex: 1,
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
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 3,
    backgroundColor: colors.card,
  },
  micHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
