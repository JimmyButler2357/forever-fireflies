import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

/**
 * Idle-triggered firefly particles that fade in when the user
 * stops touching the screen, and fade out when they interact.
 *
 * Think of real fireflies in a garden — they come out when
 * everything is still, and scatter when you move.
 *
 * Each particle:
 * - Drifts gently on X/Y axes (layered sine-like motion)
 * - Pulses independently: brief bright flash, longer dim period
 * - Random size (2–4px), position, and timing for organic feel
 *
 * The `isIdle` prop controls a master opacity that fades all
 * particles in (~2.5s) or out (~0.4s) together.
 *
 * Renders nothing when Reduce Motion is enabled.
 */

interface ParticleConfig {
  startXPct: number;      // 0–100, percentage across container
  startYPct: number;      // 0–100, percentage down container
  size: number;           // px diameter
  maxOpacity: number;     // peak brightness
  minOpacity: number;     // dim phase brightness
  driftX: number;         // px to drift on X
  driftY: number;         // px to drift on Y
  driftDuration: number;  // ms for one full drift cycle
  brightDuration: number; // ms for bright phase
  dimDuration: number;    // ms for dim phase
  delay: number;          // ms before animation starts
}

function generateParticles(count: number): ParticleConfig[] {
  return Array.from({ length: count }, () => ({
    startXPct: 8 + Math.random() * 84,
    startYPct: 5 + Math.random() * 85,
    size: 2 + Math.random() * 2.5,
    maxOpacity: 0.22 + Math.random() * 0.18,
    minOpacity: 0.03 + Math.random() * 0.03,
    driftX: (Math.random() - 0.5) * 55,
    driftY: (Math.random() - 0.5) * 45,
    driftDuration: 7000 + Math.random() * 4000,
    brightDuration: 500 + Math.random() * 400,
    dimDuration: 2000 + Math.random() * 1500,
    delay: Math.random() * 3000,
  }));
}

// ─── Single Firefly Particle ───────────────────────────────

function IdleFireflyParticle({
  config,
  masterOpacity,
}: {
  config: ParticleConfig;
  masterOpacity: SharedValue<number>;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const pulseOpacity = useSharedValue(config.minOpacity);

  useEffect(() => {
    const easing = Easing.inOut(Easing.ease);

    // Gentle drift — back and forth like a firefly meandering
    translateX.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(config.driftX, { duration: config.driftDuration, easing }),
        -1,
        true,
      ),
    );
    translateY.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(config.driftY, { duration: config.driftDuration * 1.1, easing }),
        -1,
        true,
      ),
    );

    // Pulse: brief bright flash, then longer dim period
    // (not a smooth sine — more like a real firefly blink)
    pulseOpacity.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.maxOpacity, {
            duration: config.brightDuration,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(config.minOpacity, {
            duration: config.dimDuration,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    // Master opacity controls the fade-in/out based on idle state.
    // Particle opacity controls the pulse. Multiply them together.
    opacity: pulseOpacity.value * masterOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          left: `${config.startXPct}%`,
          top: `${config.startYPct}%`,
          shadowRadius: config.size + 2,
        },
        animatedStyle,
      ]}
    />
  );
}

// ─── Main Component ──────────────────────────────────────

interface IdleFirefliesProps {
  isIdle: boolean;
  count?: number;
}

export default function IdleFireflies({
  isIdle,
  count = 12,
}: IdleFirefliesProps) {
  const reduceMotion = useReduceMotion();
  const masterOpacity = useSharedValue(0);

  // Generate particle configs once per mount (stable positions for
  // the lifetime of the screen, but fresh each time you navigate in)
  const particleConfigs = useRef(generateParticles(count)).current;

  useEffect(() => {
    if (reduceMotion) return;

    masterOpacity.value = withTiming(isIdle ? 1 : 0, {
      // Slow fade in (fireflies appearing), quick fade out (scattering)
      duration: isIdle ? 2500 : 400,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isIdle, reduceMotion]);

  if (reduceMotion) return null;

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particleConfigs.map((config, i) => (
        <IdleFireflyParticle
          key={i}
          config={config}
          masterOpacity={masterOpacity}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    backgroundColor: colors.glow,
    // Warm amber glow around each dot (iOS shadow, Android elevation)
    shadowColor: colors.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    elevation: 2,
  },
});
