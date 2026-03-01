import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  screenColors,
} from '@/constants/theme';
import { useChildrenStore } from '@/stores/childrenStore';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import PaperTexture from '@/components/PaperTexture';

// ─── Prompt bank — gentle nudges ──────────────────────────

const PROMPTS = [
  'What made you laugh together today?',
  'What new word did they say this week?',
  'Describe a tiny moment you want to remember.',
  'What surprised you about them today?',
];

// ─── Empty State Screen ───────────────────────────────────

export default function EmptyStateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const children = useChildrenStore((s) => s.children);
  const firstName = children[0]?.name ?? 'your little one';

  // Pick a random prompt on mount
  const promptIndex = useRef(Math.floor(Math.random() * PROMPTS.length)).current;
  const prompt = PROMPTS[promptIndex];

  // ─── Animations (built-in Animated — no Reanimated) ────

  const reduceMotion = useReduceMotion();
  const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(reduceMotion ? 0 : 24)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) return; // Already at final state

    // Content fades in + slides up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Mic button pulsing glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Warm gradient backdrop */}
      <View style={styles.gradientTop} />

      {/* Animated content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Heading */}
        <Text style={styles.heading}>Start {firstName}'s memory book</Text>
        <Text style={styles.body}>
          One moment a day. That's all it takes.
        </Text>

        {/* Prompt card */}
        <View style={[styles.promptCard, shadows.promptCard]}>
          <PaperTexture radius={radii.card} />
          <Text style={styles.promptText}>{prompt}</Text>
        </View>

        {/* Mic button (inline — no Reanimated) */}
        <View style={styles.micWrap}>
          <Animated.View
            style={[
              styles.micGlow,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />
          <Pressable
            onPress={() => router.push('/(main)/recording')}
            style={({ pressed }) => [
              styles.micButton,
              shadows.micButtonHome,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="mic" size={40} color={colors.card} />
          </Pressable>
        </View>

        {/* Write instead link */}
        <Pressable
          onPress={() => router.push('/(main)/entry-detail')}
          style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="pencil" size={14} color={colors.textSoft} />
          <Text style={styles.link}>or write instead</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 360,
    backgroundColor: screenColors.recordingBackdrop,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(8),
    gap: spacing(4),
  },
  heading: {
    ...typography.sectionHeading,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    ...typography.formLabel,
    color: colors.textSoft,
    textAlign: 'center',
    marginBottom: spacing(2),
  },
  promptCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  promptText: {
    ...typography.promptCard,
    color: colors.text,
    textAlign: 'center',
  },
  micWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(4),
  },
  micGlow: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: colors.accent,
    opacity: 0.15,
  },
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  link: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSoft,
    marginTop: spacing(2),
  },
});
