import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows, screenColors } from '@/constants/theme';
import { useChildrenStore } from '@/stores/childrenStore';
import { useEntriesStore } from '@/stores/entriesStore';
import PaperTexture from '@/components/PaperTexture';
import { useLocation } from '@/hooks/useLocation';

/**
 * First Recording — onboarding step 5.
 * Uses a simple inline mic button (no Reanimated) to avoid
 * native worklets version mismatch in Expo Go.
 * Pulsing glow animation will be added in Chunk 12 polish pass.
 */
export default function FirstRecordingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const children = useChildrenStore((s) => s.children);
  const addEntry = useEntriesStore((s) => s.addEntry);
  const { locationText } = useLocation();
  const firstName = children.length > 0 ? children[0].name : 'your child';

  const handleRecord = () => {
    addEntry({
      text: `A precious moment with ${firstName} that I never want to forget.`,
      date: new Date().toISOString(),
      childIds: children.length > 0 ? [children[0].id] : [],
      tags: ['first-memory'],
      isFavorited: true,
      hasAudio: true,
      locationText: locationText ?? undefined,
    });
    router.push('/(onboarding)/memory-saved');
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
            What's something {firstName} did recently that you don't want to forget?
          </Text>
        </View>

        {/* Simple mic button — no Reanimated */}
        <Pressable
          onPress={handleRecord}
          style={({ pressed }) => [
            styles.micButton,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="mic" size={40} color={colors.card} />
        </Pressable>

        {/* Write instead link */}
        <Pressable
          onPress={() => router.push('/(onboarding)/first-memory-text')}
          style={styles.writeLink}
        >
          <Ionicons name="pencil-outline" size={14} color={colors.accent} />
          <Text style={styles.writeLinkText}>or write instead</Text>
        </Pressable>
      </View>
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
  micButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    // Static glow shadow (no animation)
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 4,
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
});
