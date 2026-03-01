import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors, shadows, spacing } from '@/constants/theme';

interface MicButtonProps {
  size: 'large' | 'home';
  onPress: () => void;
  pulsing?: boolean;
}

const SIZES = {
  large: 96,
  home: 68,
} as const;

const ICON_SIZES = {
  large: 40,
  home: 28,
} as const;

/**
 * Primary mic recording button with optional pulsing glow animation.
 * Large (96px): Recording screen, onboarding.
 * Home (68px): Floating action on Home screen.
 */
export default function MicButton({ size, onPress, pulsing = false }: MicButtonProps) {
  const dimension = SIZES[size];
  const iconSize = ICON_SIZES[size];
  const glowScale = useSharedValue(1);

  useEffect(() => {
    if (pulsing) {
      glowScale.value = withRepeat(
        withTiming(1.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      glowScale.value = withTiming(1, { duration: 300 });
    }
  }, [pulsing]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: pulsing ? 0.35 : 0,
  }));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrapper,
        pressed && { opacity: 0.85 },
      ]}
    >
      {/* Pulsing glow layer behind the button */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: dimension + spacing(10),
            height: dimension + spacing(10),
            borderRadius: (dimension + spacing(10)) / 2,
          },
          glowStyle,
        ]}
      />
      {/* Actual button */}
      <Animated.View
        style={[
          styles.button,
          size === 'home' && shadows.micButtonHome,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
          },
        ]}
      >
        <Ionicons name="mic" size={iconSize} color={colors.card} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.accent,
  },
  button: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
