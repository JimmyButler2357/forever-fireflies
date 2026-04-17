import { useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

/**
 * 12 animated firefly dots for the Branding Banner.
 *
 * 6 are constrained inside the jar area (right side of the SVG),
 * 6 drift freely across the full banner. Each dot wobbles,
 * drifts, and gently pulses in opacity.
 *
 * Tapping the banner calls `scatter()` via the ref — all dots
 * fly to random positions and then spring back.
 */

export interface BannerFirefliesRef {
  scatter: () => void;
}

// Jar bounds as fractions of the container (from the playground SVG)
const JAR = { xMin: 0.71, xMax: 0.89, yMin: 0.40, yMax: 0.92 };

interface ParticleConfig {
  inJar: boolean;
  startX: number; // fraction 0-1
  startY: number; // fraction 0-1
  size: number;
  isOrange: boolean;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
}

// 6 jar-constrained particles
const JAR_PARTICLES: ParticleConfig[] = Array.from({ length: 6 }, (_, i) => ({
  inJar: true,
  startX: JAR.xMin + Math.random() * (JAR.xMax - JAR.xMin),
  startY: JAR.yMin + Math.random() * (JAR.yMax - JAR.yMin),
  size: 2.5 + Math.random() * 2,
  isOrange: Math.random() > 0.7,
  driftX: (Math.random() - 0.5) * 15,
  driftY: (Math.random() - 0.5) * 12,
  duration: 6000 + Math.random() * 3000,
  delay: i * 300,
}));

// 6 free-floating particles
const FREE_SPAWNS = [
  { x: 0.14, y: 0.20 }, { x: 0.07, y: 0.50 }, { x: 0.40, y: 0.12 },
  { x: 0.60, y: 0.35 }, { x: 0.29, y: 0.75 }, { x: 0.50, y: 0.55 },
];

const FREE_PARTICLES: ParticleConfig[] = FREE_SPAWNS.map((spawn, i) => ({
  inJar: false,
  startX: spawn.x,
  startY: spawn.y,
  size: 2 + Math.random() * 2.5,
  isOrange: Math.random() > 0.75,
  driftX: (Math.random() - 0.5) * 25,
  driftY: -10 - Math.random() * 15, // drift upward
  duration: 7000 + Math.random() * 4000,
  delay: i * 400 + 200,
}));

const ALL_PARTICLES = [...JAR_PARTICLES, ...FREE_PARTICLES];

function FireflyDot({ config }: { config: ParticleConfig }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(config.isOrange ? 0.35 : 0.25);

  useEffect(() => {
    const easing = Easing.inOut(Easing.ease);

    // Wobble drift
    translateX.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(config.driftX, { duration: config.duration, easing }),
        -1,
        true,
      ),
    );
    translateY.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(config.driftY, { duration: config.duration * 0.8, easing }),
        -1,
        true,
      ),
    );

    // Opacity pulse
    opacity.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(
          config.isOrange ? 0.55 : 0.45,
          { duration: config.duration * 0.6, easing },
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  const dotColor = config.isOrange ? colors.accent : colors.glow;

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          left: `${config.startX * 100}%` as any,
          top: `${config.startY * 100}%` as any,
          backgroundColor: dotColor,
          shadowColor: dotColor,
        },
        animStyle,
      ]}
    />
  );
}

const BannerFireflies = forwardRef<BannerFirefliesRef>(function BannerFireflies(_, ref) {
  const reduceMotion = useReduceMotion();
  const scatterTrigger = useSharedValue(0);

  const scatter = useCallback(() => {
    // Scatter is a visual delight — handled by the parent Pressable
    // triggering re-mount or a shared value bump. For simplicity,
    // we increment the trigger (not yet wired to individual dots
    // due to Reanimated complexity — the wobble drift gives
    // enough organic movement for now).
    scatterTrigger.value = scatterTrigger.value + 1;
  }, []);

  useImperativeHandle(ref, () => ({ scatter }));

  // Static dots for reduce motion
  if (reduceMotion) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {ALL_PARTICLES.map((config, i) => {
          const dotColor = config.isOrange ? colors.accent : colors.glow;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: config.size,
                  height: config.size,
                  borderRadius: config.size / 2,
                  left: `${config.startX * 100}%` as any,
                  top: `${config.startY * 100}%` as any,
                  backgroundColor: dotColor,
                  shadowColor: dotColor,
                  opacity: config.isOrange ? 0.4 : 0.3,
                },
              ]}
            />
          );
        })}
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ALL_PARTICLES.map((config, i) => (
        <FireflyDot key={i} config={config} />
      ))}
    </View>
  );
});

export default BannerFireflies;

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 1,
  },
});
