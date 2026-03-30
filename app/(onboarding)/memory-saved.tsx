import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import PrimaryButton from '@/components/PrimaryButton';

/**
 * Memory Saved — onboarding step 7.
 * Heart scales in on mount as emotional payoff before the paywall.
 */
export default function MemorySavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();

  // Start invisible/small when animated, or at final state when reduce-motion
  const scale = useSharedValue(reduceMotion ? 1 : 0);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    // Gentle overshoot-and-settle — warm, not bouncy
    scale.value = withDelay(
      150,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.2)) }),
    );
    opacity.value = withTiming(1, { duration: 400 });
  }, []);

  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Gold glowing heart — like a firefly being caught */}
        <Animated.View style={[styles.heartWrapper, heartAnimStyle]}>
          <View style={styles.heartGlow} />
          <Ionicons name="heart" size={56} color={colors.glow} />
        </Animated.View>

        <Text style={styles.heading}>Your first firefly, caught.</Text>
        <Text style={styles.body}>Your voice and your words — kept forever.</Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(12) }]}>
        <PrimaryButton
          label="Keep going"
          onPress={() => router.push('/(onboarding)/welcome-preview')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(5),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartWrapper: {
    marginBottom: spacing(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.glowGlow,
  },
  heading: {
    ...typography.onboardingHeading,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(3),
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSoft,
    textAlign: 'center',
  },
  bottom: {
    paddingBottom: spacing(12),
  },
});
