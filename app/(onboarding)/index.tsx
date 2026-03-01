import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goToAddChild = () => router.push('/(onboarding)/add-child');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Upper area — title + tagline */}
      <View style={styles.upper}>
        <Text style={styles.title}>Core Memories</Text>
        <Text style={styles.tagline}>You'll never forget the little things.</Text>
      </View>

      {/* Lower area — auth buttons + legal */}
      <View style={[styles.lower, { paddingBottom: insets.bottom + spacing(12) }]}>
        {/* Continue with Apple */}
        <Pressable
          onPress={goToAddChild}
          style={({ pressed }) => [
            styles.authButton,
            styles.appleButton,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="logo-apple" size={20} color={colors.card} />
          <Text style={[styles.authLabel, styles.appleLabelColor]}>Continue with Apple</Text>
        </Pressable>

        {/* Continue with Google */}
        <Pressable
          onPress={goToAddChild}
          style={({ pressed }) => [
            styles.authButton,
            styles.googleButton,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.googleG}>G</Text>
          <Text style={[styles.authLabel, styles.googleLabelColor]}>Continue with Google</Text>
        </Pressable>

        {/* Continue with Email */}
        <Pressable
          onPress={goToAddChild}
          style={({ pressed }) => [
            styles.authButton,
            styles.emailButton,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="mail-outline" size={18} color={colors.text} />
          <Text style={[styles.authLabel, styles.emailLabelColor]}>Continue with Email</Text>
        </Pressable>

        {/* Legal links */}
        <View style={styles.legal}>
          <Text style={styles.legalText}>Terms of Service</Text>
          <Text style={styles.legalDot}>·</Text>
          <Text style={styles.legalText}>Privacy Policy</Text>
        </View>
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
  upper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.appTitleLarge,
    color: colors.text,
    marginBottom: spacing(2),
  },
  tagline: {
    ...typography.onboardingTagline,
    color: colors.textSoft,
  },
  lower: {
    gap: spacing(3),
    paddingBottom: spacing(12),
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 15,
    borderRadius: radii.md,
    gap: spacing(2),
  },
  appleButton: {
    backgroundColor: colors.text,
  },
  googleButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emailButton: {
    backgroundColor: colors.tag,
  },
  authLabel: {
    ...typography.buttonLabel,
  },
  appleLabelColor: {
    color: colors.card,
  },
  googleLabelColor: {
    color: colors.text,
  },
  emailLabelColor: {
    color: colors.text,
  },
  googleG: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  legal: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing(2),
    marginTop: spacing(2),
  },
  legalText: {
    ...typography.timestamp,
    color: colors.textMuted,
  },
  legalDot: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
