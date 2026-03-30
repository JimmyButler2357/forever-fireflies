import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

/**
 * 4 tiny gold dots that drift slowly across their container,
 * like real fireflies in peripheral vision.
 *
 * Each particle:
 * - 2–4px diameter, 15–20% opacity
 * - Drifts on X and Y axes over 8–10 seconds via Reanimated
 * - Different size, speed, and start position for organic feel
 *
 * Renders nothing when Reduce Motion is enabled — this is purely
 * decorative, so we respect the accessibility preference completely.
 *
 * Usage: wrap in an absolutely-positioned container that covers
 * the area you want fireflies in:
 *
 *   <View style={StyleSheet.absoluteFill} pointerEvents="none">
 *     <FloatingFireflies />
 *   </View>
 */

interface Particle {
  size: number;
  opacity: number;
  startX: `${number}%`;    // percentage across container
  startY: `${number}%`;    // percentage down container
  driftX: number;    // px to move on X
  driftY: number;    // px to move on Y
  duration: number;  // ms for one full drift cycle
  delay: number;     // ms before animation starts
}

const PARTICLES: Particle[] = [
  { size: 3, opacity: 0.18, startX: '15%', startY: '20%', driftX: 40, driftY: -30, duration: 9000, delay: 0 },
  { size: 2, opacity: 0.15, startX: '70%', startY: '35%', driftX: -35, driftY: 25, duration: 10000, delay: 1200 },
  { size: 4, opacity: 0.20, startX: '40%', startY: '60%', driftX: 30, driftY: -40, duration: 8500, delay: 600 },
  { size: 2, opacity: 0.16, startX: '80%', startY: '75%', driftX: -25, driftY: -20, duration: 9500, delay: 2000 },
];

function FireflyParticle({ particle }: { particle: Particle }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const easing = Easing.inOut(Easing.ease);

    translateX.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(particle.driftX, { duration: particle.duration, easing }),
        -1,
        true,
      ),
    );
    translateY.value = withDelay(
      particle.delay,
      withRepeat(
        withTiming(particle.driftY, { duration: particle.duration, easing }),
        -1,
        true,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          opacity: particle.opacity,
          left: particle.startX,
          top: particle.startY,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function FloatingFireflies() {
  const reduceMotion = useReduceMotion();

  // Purely decorative — skip entirely for reduced motion
  if (reduceMotion) return null;

  return (
    <>
      {PARTICLES.map((p, i) => (
        <FireflyParticle key={i} particle={p} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    backgroundColor: colors.glow,
    shadowColor: colors.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 1,
  },
});
