import { useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, radii, durations } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

interface Props {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function Skeleton({
  width,
  height,
  borderRadius = radii.sm,
  style,
}: Props) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 0.7 : 0.55);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(
      withTiming(0.9, {
        duration: durations.skeletonShimmer,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}
