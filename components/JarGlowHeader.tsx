import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

/**
 * A warm glow that sits behind the Firefly Jar header area.
 * Its intensity scales with the number of favorites — like a
 * jar filling up with fireflies, getting brighter as more arrive.
 *
 * Thresholds:
 * - 0 favorites: no glow (completely transparent)
 * - 1–5: faint warmth, barely visible
 * - 6–24: gentle amber glow, growing steadily
 * - 25–79: warm halo ring appears around the glow
 * - 80–200+: maximum brightness, prominent halo
 *
 * The glow is a radial gradient faked with layered circles
 * (React Native doesn't have CSS radial-gradient natively).
 *
 * Props:
 * - `count` — number of favorited entries (drives the glow intensity)
 */

interface Props {
  count: number;
}

/**
 * Maps a favorites count to a 0–1 intensity value.
 * Grows quickly at first (each new favorite matters more when
 * you have few), then tapers off with a square-root curve.
 *
 * 0 → 0, 5 → 0.16, 25 → 0.35, 80 → 0.63, 200 → 1.0
 */
function countToIntensity(count: number): number {
  'worklet';
  if (count <= 0) return 0;
  // Square root gives a nice diminishing-returns curve
  // Clamp at 200 entries for max glow
  const clamped = Math.min(count, 200);
  return Math.sqrt(clamped / 200);
}

export default function JarGlowHeader({ count }: Props) {
  const reduceMotion = useReduceMotion();
  const intensity = useSharedValue(countToIntensity(count));

  useEffect(() => {
    const target = countToIntensity(count);
    if (reduceMotion) {
      intensity.value = target;
    } else {
      intensity.value = withTiming(target, {
        duration: 800,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [count, reduceMotion]);

  // Inner glow — the main warm circle
  const innerStyle = useAnimatedStyle(() => {
    const i = intensity.value;
    return {
      opacity: i * 0.6,
      transform: [{ scale: 0.8 + i * 0.4 }],
    };
  });

  // Outer halo — appears at 25+ favorites (intensity ~0.35)
  const haloStyle = useAnimatedStyle(() => {
    const i = intensity.value;
    // Halo fades in between intensity 0.3 and 0.5
    const haloOpacity = Math.max(0, Math.min((i - 0.3) / 0.2, 1));
    return {
      opacity: haloOpacity * 0.35,
      transform: [{ scale: 0.9 + i * 0.3 }],
    };
  });

  // Don't render the decorative glow if count is 0
  if (count <= 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Outer halo — bigger, softer, appears at 25+ */}
      <Animated.View style={[styles.halo, haloStyle]} />
      {/* Inner glow — core warmth */}
      <Animated.View style={[styles.inner, innerStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    alignItems: 'center',
    height: 160,
  },
  inner: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.glow,
    shadowColor: colors.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 4,
  },
  halo: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.glowSoft,
    shadowColor: colors.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 60,
    elevation: 2,
  },
});
