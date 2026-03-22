import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

/**
 * "Catch a firefly" animation that plays when the user favorites an entry.
 *
 * Two parts:
 * 1. **Amber burst** — 8 tiny gold dots radiate outward from the heart
 *    and fade over ~400ms. Like a firefly lighting up at the moment
 *    you catch it.
 *
 * 2. **Rising firefly** — a brighter dot emerges and floats upward
 *    with a gentle S-curve, then fades. Like the firefly drifting
 *    into the jar.
 *
 * The total animation is 1.2 seconds. Renders as a full-screen
 * overlay with pointerEvents="none" so it doesn't block touches.
 *
 * Props:
 * - `originX`, `originY` — screen position of the heart button
 * - `onComplete` — called when the animation finishes (unmount the component)
 */

const BURST_COUNT = 8;
const TOTAL_DURATION = 1200;

interface Props {
  originX: number;
  originY: number;
  onComplete: () => void;
}

// ─── Burst Particle ──────────────────────────────────────

function BurstDot({
  originX,
  originY,
  endX,
  endY,
  size,
  progress,
}: {
  originX: number;
  originY: number;
  endX: number;
  endY: number;
  size: number;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    // Burst completes in the first ~35% of total duration
    const t = Math.min(progress.value * 2.8, 1);
    return {
      position: 'absolute',
      left: originX - size / 2,
      top: originY - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.glow,
      shadowColor: colors.glow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: (1 - t) * 0.7,
      shadowRadius: 5,
      elevation: 2,
      transform: [
        { translateX: endX * t },
        { translateY: endY * t },
      ],
      opacity: (1 - t) * 0.85,
    };
  });

  return <Animated.View style={style} />;
}

// ─── Rising Firefly ─────────────────────────────────────

function RisingFirefly({
  originX,
  originY,
  progress,
}: {
  originX: number;
  originY: number;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    // Rising starts at ~15% progress (after burst begins)
    const raw = Math.max(0, (progress.value - 0.15) / 0.85);
    // Ease-out: fast start, slow finish (like floating up)
    const ease = 1 - Math.pow(1 - raw, 2.5);

    // Gentle S-curve — one smooth wobble, not zigzaggy.
    // Amplitude is 12px max, and the envelope (sin(t*PI))
    // means zero wobble at start and end, max in the middle.
    const wobble = Math.sin(raw * Math.PI * 1.5) * 12 * Math.sin(raw * Math.PI);

    // Fade in at start, fade out at end
    let opacity = 0;
    if (raw > 0) {
      opacity = 1;
      if (raw < 0.12) opacity = raw / 0.12;
      else if (raw > 0.75) opacity = (1 - raw) / 0.25;
    }

    return {
      position: 'absolute',
      left: originX - 4,
      top: originY - 4,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.glow,
      shadowColor: colors.glow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: opacity * 0.9,
      shadowRadius: 10,
      elevation: 3,
      transform: [
        { translateX: wobble },
        { translateY: -160 * ease },
      ],
      opacity,
    };
  });

  return <Animated.View style={style} />;
}

// ─── Main Component ─────────────────────────────────────

export default function FavoriteAnimation({
  originX,
  originY,
  onComplete,
}: Props) {
  const progress = useSharedValue(0);

  // Pre-compute burst directions (random but stable for this animation instance)
  const burstDirs = useMemo(
    () =>
      Array.from({ length: BURST_COUNT }, (_, i) => {
        const angle =
          (Math.PI * 2 * i) / BURST_COUNT + (Math.random() - 0.5) * 0.6;
        const dist = 22 + Math.random() * 22;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          size: 2.5 + Math.random() * 2.5,
        };
      }),
    [],
  );

  useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: TOTAL_DURATION, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(onComplete)();
      },
    );
  }, []);

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {burstDirs.map((dir, i) => (
        <BurstDot
          key={i}
          originX={originX}
          originY={originY}
          endX={dir.x}
          endY={dir.y}
          size={dir.size}
          progress={progress}
        />
      ))}
      <RisingFirefly
        originX={originX}
        originY={originY}
        progress={progress}
      />
    </Animated.View>
  );
}
