import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows, screenColors } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import PaperTexture from '@/components/PaperTexture';

/**
 * First Recording — onboarding step 5.
 * Uses built-in RN Animated API (no Reanimated) for the
 * breathing pulse glow behind the mic button.
 */
export default function FirstRecordingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [reduceMotion]);

  const handleRecord = () => {
    router.push({
      pathname: '/(main)/recording',
      params: { onboarding: 'true' },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Warm radial gradient backdrop approximation */}
      <View style={styles.gradientBackdrop} />

      <View style={styles.content}>
        {/* Prompt card */}
        <View style={styles.promptCard}>
          <PaperTexture />
          <Text style={styles.promptText}>
            What's something your child did recently that you don't want to forget?
          </Text>
        </View>

        {/* Mic button with breathing pulse glow */}
        <View style={styles.micWrapper}>
          <Animated.View
            style={[
              styles.pulseCircle,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />
          <Pressable
            onPress={handleRecord}
            style={({ pressed }) => [
              styles.micButton,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="mic" size={40} color={colors.card} />
          </Pressable>
        </View>

        {/* Write instead link */}
        <Pressable
          onPress={() => router.push('/(onboarding)/first-memory-text')}
          style={styles.writeLink}
        >
          <Ionicons name="pencil-outline" size={14} color={colors.accent} />
          <Text style={styles.writeLinkText}>or write instead</Text>
        </Pressable>
      </View>

      {/* Skip — subtle bottom text for users who want to explore first */}
      <Pressable
        onPress={() => router.push('/(onboarding)/welcome-preview')}
        style={[styles.skipLink, { paddingBottom: insets.bottom + spacing(6) }]}
      >
        <Text style={styles.skipLinkText}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  gradientBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: screenColors.recordingBackdrop,
    opacity: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(5),
    gap: spacing(8),
  },
  promptCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(6),
    ...shadows.promptCard,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    width: '100%',
  },
  promptText: {
    ...typography.promptCard,
    color: colors.text,
    textAlign: 'center',
  },
  micWrapper: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentGlow,
  },
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 4,
    zIndex: 1,
  },
  writeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  writeLinkText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.accent,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: spacing(4),
    minHeight: 44,
    justifyContent: 'center',
  },
  skipLinkText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
  },
});
