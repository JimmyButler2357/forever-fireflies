import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, hitSlop } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import TopBar from '@/components/TopBar';
import PrimaryButton from '@/components/PrimaryButton';
import { capture } from '@/lib/posthog';

/**
 * Email auth screen — handles both sign-up and sign-in.
 *
 * This is a "dual mode" form — the user can toggle between
 * "Create Account" and "Sign In" modes. Both use the same
 * two fields (email + password), but they call different
 * methods on the auth store:
 *
 * - Sign Up → authStore.signUp() → creates a new user in Supabase
 * - Sign In → authStore.signIn() → authenticates an existing user
 *
 * Why one screen for both? Because the UI is nearly identical —
 * same fields, same layout. The only differences are the button
 * label and the toggle text at the bottom. Keeping them together
 * avoids duplicating code.
 *
 * After successful auth, the auth state listener in _layout.tsx
 * detects the new session and the router in index.tsx sends the
 * user to the right place (add-child for new users, home for
 * returning users who've completed onboarding).
 */
export default function EmailAuthScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuthStore();

  // "mode" toggles the form between sign-up and sign-in.
  // Think of it like a light switch — same room (screen),
  // different lighting (behavior).
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isFormValid = email.trim().length > 0 && password.length >= 6;

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password);
        // If no session after signup, email confirmation is required.
        // Don't fire account_created yet — they haven't confirmed.
        const { session } = useAuthStore.getState();
        if (!session) {
          setSuccess('Check your email for a confirmation link!');
          return;
        }
        capture('account_created', { method: 'email' });
      } else {
        await signIn(email.trim(), password);
      }

      // Navigate forward after successful auth.
      // New users → add-child, returning users → home.
      const { hasCompletedOnboarding } = useAuthStore.getState();
      if (hasCompletedOnboarding) {
        router.replace('/(main)/(tabs)/home');
      } else {
        router.replace('/(onboarding)/add-child');
      }
    } catch (err) {
      // Show the error message to the user. Common errors:
      // - "Invalid login credentials" (wrong email/password)
      // - "User already registered" (email taken on signup)
      // - "Password should be at least 6 characters" (too short)
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signup' ? 'signin' : 'signup');
    setError(null); // Clear any error when switching modes
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TopBar showBack title="" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>
          {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'signup'
            ? 'Start saving your family\'s moments.'
            : 'Sign in to see your memories.'}
        </Text>

        {/* Email field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!isLoading}
          />
        </View>

        {/* Password field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              editable={!isLoading}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={hitSlop.icon}
              style={styles.eyeButton}
            >
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        {/* Forgot password link — only visible in sign-in mode */}
        {mode === 'signin' && (
          <Pressable
            onPress={() => router.push('/(onboarding)/forgot-password')}
            style={styles.forgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>
        )}

        {/* Feedback messages */}
        {error && <Text style={styles.error}>{error}</Text>}
        {success && <Text style={styles.success}>{success}</Text>}

        {/* Submit button */}
        <View style={styles.buttonWrap}>
          <PrimaryButton
            label={isLoading
              ? (mode === 'signup' ? 'Creating Account...' : 'Signing In...')
              : (mode === 'signup' ? 'Create Account' : 'Sign In')}
            onPress={handleSubmit}
            disabled={!isFormValid || isLoading}
          />
        </View>

        {/* Mode toggle — switch between sign-up and sign-in */}
        <Pressable onPress={toggleMode} style={styles.toggle}>
          <Text style={styles.toggleText}>
            {mode === 'signup'
              ? 'Already have an account? '
              : 'Don\'t have an account? '}
            <Text style={styles.toggleLink}>
              {mode === 'signup' ? 'Sign In' : 'Create Account'}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
    paddingBottom: spacing(8),
  },
  heading: {
    ...typography.sectionHeading,
    color: colors.text,
    marginBottom: spacing(2),
  },
  subtitle: {
    ...typography.onboardingTagline,
    color: colors.textSoft,
    marginBottom: spacing(8),
  },
  fieldGroup: {
    marginBottom: spacing(5),
  },
  label: {
    ...typography.formLabel,
    color: colors.text,
    marginBottom: spacing(2),
  },
  input: {
    ...typography.formLabel,
    color: colors.text,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  passwordInput: {
    ...typography.formLabel,
    color: colors.text,
    flex: 1,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  eyeButton: {
    paddingHorizontal: spacing(3),
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    paddingVertical: spacing(2),
    marginTop: -spacing(2),
    marginBottom: spacing(2),
  },
  forgotPasswordText: {
    ...typography.caption,
    color: colors.accent,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing(4),
  },
  success: {
    ...typography.caption,
    color: colors.accent,
    marginBottom: spacing(4),
  },
  buttonWrap: {
    marginTop: spacing(2),
  },
  toggle: {
    alignItems: 'center',
    marginTop: spacing(5),
    padding: spacing(2),
  },
  toggleText: {
    ...typography.formLabel,
    color: colors.textSoft,
  },
  toggleLink: {
    color: colors.accent,
    fontWeight: '700',
  },
});
