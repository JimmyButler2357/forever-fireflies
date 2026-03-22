import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { colors, typography, spacing, fonts } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

/**
 * Milestone celebration — a "cascade" of fireflies that rain down
 * from the top of the screen like warm golden confetti.
 *
 * Think of shaking a jar of fireflies upside-down — they tumble
 * out and float downward at different speeds, drifting left and right,
 * each fading out as it reaches the bottom.
 *
 * Milestones:
 * - 1st entry: 20 fireflies + "Your first firefly!"
 * - 10th entry: 30 fireflies + "10 memories and counting!"
 * - 100th entry: 50 fireflies + "100 memories — what a treasure!"
 *
 * The component auto-unmounts via `onComplete` after the last
 * firefly fades out (~3.5s total).
 *
 * Props:
 * - `count` — number of fireflies to show
 * - `message` — the warm copy line to display
 * - `onComplete` — called when the animation finishes (unmount the component)
 */

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOTAL_DURATION = 3500;

interface Props {
  count: number;
  message: string;
  onComplete: () => void;
}

interface CascadeParticle {
  startX: number;       // horizontal start position (px)
  driftX: number;       // horizontal drift (px, can be negative)
  startDelay: number;   // ms before this particle starts falling
  fallDuration: number; // ms to reach the bottom
  size: number;         // px diameter
}

function generateCascade(count: number): CascadeParticle[] {
  return Array.from({ length: count }, () => ({
    startX: Math.random() * (SCREEN_WIDTH - 20) + 10,
    driftX: (Math.random() - 0.5) * 80,
    startDelay: Math.random() * 1200,
    fallDuration: 1800 + Math.random() * 1200,
    size: 2.5 + Math.random() * 3,
  }));
}

// ─── Single Cascade Particle ──────────────────────────────

function CascadeFirefly({
  particle,
  masterProgress,
}: {
  particle: CascadeParticle;
  masterProgress: SharedValue<number>;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      particle.startDelay,
      withTiming(1, {
        duration: particle.fallDuration,
        easing: Easing.in(Easing.ease),
      }),
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const t = progress.value;

    // Fade in quickly at start, fade out in last 30%
    let opacity = 0;
    if (t > 0) {
      opacity = 1;
      if (t < 0.1) opacity = t / 0.1;
      else if (t > 0.7) opacity = (1 - t) / 0.3;
    }

    // Gentle wobble as it falls — like a leaf drifting
    const wobble = Math.sin(t * Math.PI * 2.5) * particle.driftX * 0.4;

    return {
      position: 'absolute',
      left: particle.startX - particle.size / 2,
      top: -10,
      width: particle.size,
      height: particle.size,
      borderRadius: particle.size / 2,
      backgroundColor: colors.glow,
      shadowColor: colors.glow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: opacity * 0.7,
      shadowRadius: particle.size + 3,
      elevation: 2,
      transform: [
        { translateX: particle.driftX * t + wobble },
        { translateY: (SCREEN_HEIGHT + 20) * t },
      ],
      opacity: opacity * masterProgress.value,
    };
  });

  return <Animated.View style={style} />;
}

// ─── Message Overlay ──────────────────────────────────────

function CelebrationMessage({
  message,
  masterProgress,
}: {
  message: string;
  masterProgress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    // Message appears at 10% and fades out at 80%
    const p = masterProgress.value;
    let opacity = 0;
    if (p > 0.05 && p < 0.85) {
      if (p < 0.15) opacity = (p - 0.05) / 0.1;
      else if (p > 0.7) opacity = (0.85 - p) / 0.15;
      else opacity = 1;
    }

    return {
      opacity,
      transform: [
        // Gentle float upward as it fades
        { translateY: -20 * p },
      ],
    };
  });

  return (
    <Animated.View style={[styles.messageContainer, style]}>
      <Text style={styles.messageText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Main Component ───────────────────────────────────────

export default function MilestoneCelebration({
  count,
  message,
  onComplete,
}: Props) {
  const reduceMotion = useReduceMotion();
  const masterProgress = useSharedValue(0);

  const particles = useMemo(() => generateCascade(count), [count]);

  useEffect(() => {
    if (reduceMotion) {
      // Still show the message briefly, just skip the particles
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }

    masterProgress.value = withTiming(
      1,
      { duration: TOTAL_DURATION, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(onComplete)();
      },
    );
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Particles — skip if reduce motion */}
      {!reduceMotion &&
        particles.map((particle, i) => (
          <CascadeFirefly
            key={i}
            particle={particle}
            masterProgress={masterProgress}
          />
        ))}

      {/* Warm message — always shown */}
      <CelebrationMessage message={message} masterProgress={masterProgress} />
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing(8),
  },
  messageText: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.glow,
    textAlign: 'center',
    textShadowColor: 'rgba(242,201,76,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
});
