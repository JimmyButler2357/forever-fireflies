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
 * "Catch a firefly" burst animation — plays when the user favorites an entry.
 *
 * 8 tiny gold dots radiate outward from the heart and fade over ~400ms,
 * like a firefly lighting up at the moment you catch it.
 *
 * Renders as a full-screen overlay with pointerEvents="none" so it
 * doesn't block touches. Auto-unmounts via onComplete when done.
 *
 * Props:
 * - `originX`, `originY` — screen position of the heart button center
 * - `onComplete` — called when the animation finishes (unmount the component)
 */

const BURST_COUNT = 8;
const TOTAL_DURATION = 500;

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
    const t = progress.value;
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
    </Animated.View>
  );
}
