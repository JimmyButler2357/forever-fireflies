import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '@/constants/theme';
import { authService } from '@/services/auth.service';
import { config } from '@/lib/config';

/**
 * Sign In screen — the very first screen new users see.
 *
 * Three sign-in options:
 * 1. Apple (OAuth) — opens Apple's login sheet
 * 2. Google (OAuth) — opens Google's login page
 * 3. Email — navigates to our own email/password form
 *
 * Apple and Google use "OAuth" — a system where Apple/Google
 * verify the user's identity and send us back a token.
 * We never see the user's Apple/Google password.
 *
 * Email auth is different — we handle it ourselves with a
 * form where users type their email and choose a password.
 */
export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Track whether an auth action is in progress.
  // While loading, all buttons are disabled to prevent
  // the user from tapping twice (which would start two
  // auth flows at once and cause weird behavior).
  const [isLoading, setIsLoading] = useState(false);

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      // This opens Apple's sign-in sheet. After the user
      // authenticates, Supabase receives a token from Apple,
      // creates/finds the user, and triggers our auth listener
      // (set up in _layout.tsx), which loads their profile.
      await authService.signInWithApple();
      // The auth state change listener in _layout.tsx will
      // handle navigation — we don't need to manually route.
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      Alert.alert('Sign In Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      Alert.alert('Sign In Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  // Email doesn't do auth right here — it navigates to a
  // separate screen with a form (email + password fields).
  const handleEmailPress = () => {
    router.push('/(onboarding)/email-auth');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Upper area — title + tagline */}
      <View style={styles.upper}>
        <Text style={styles.title}>Forever Fireflies</Text>
        <Text style={styles.tagline}>You'll never forget the little things.</Text>
      </View>

      {/* Lower area — auth buttons + legal */}
      <View style={[styles.lower, { paddingBottom: insets.bottom + spacing(12) }]}>
        {/* Continue with Apple */}
        <Pressable
          onPress={handleAppleSignIn}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.authButton,
            styles.appleButton,
            (pressed || isLoading) && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="logo-apple" size={20} color={colors.card} />
          <Text style={[styles.authLabel, styles.appleLabelColor]}>Continue with Apple</Text>
        </Pressable>

        {/* Continue with Google */}
        <Pressable
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.authButton,
            styles.googleButton,
            (pressed || isLoading) && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.googleG}>G</Text>
          <Text style={[styles.authLabel, styles.googleLabelColor]}>Continue with Google</Text>
        </Pressable>

        {/* Continue with Email */}
        <Pressable
          onPress={handleEmailPress}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.authButton,
            styles.emailButton,
            (pressed || isLoading) && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="mail-outline" size={18} color={colors.text} />
          <Text style={[styles.authLabel, styles.emailLabelColor]}>Continue with Email</Text>
        </Pressable>

        {/* Legal links */}
        <View style={styles.legal}>
          <Pressable onPress={() => Linking.openURL(config.termsOfServiceUrl)}>
            <Text style={styles.legalText}>Terms of Service</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => Linking.openURL(config.privacyPolicyUrl)}>
            <Text style={styles.legalText}>Privacy Policy</Text>
          </Pressable>
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
