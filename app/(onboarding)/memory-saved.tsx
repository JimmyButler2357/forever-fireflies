import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '@/constants/theme';
import { useChildrenStore } from '@/stores/childrenStore';
import PrimaryButton from '@/components/PrimaryButton';

/**
 * Memory Saved — onboarding step 7.
 * Static heart icon (no Reanimated) to avoid native worklets
 * version mismatch in Expo Go.
 * Scale-in animation will be added in Chunk 12 polish pass.
 */
export default function MemorySavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const children = useChildrenStore((s) => s.children);
  const firstName = children.length > 0 ? children[0].name : 'Your child';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Static heart — animation deferred to polish pass */}
        <View style={styles.heartWrapper}>
          <Ionicons name="heart" size={56} color={colors.accent} />
        </View>

        <Text style={styles.heading}>{firstName}'s first memory, saved.</Text>
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
