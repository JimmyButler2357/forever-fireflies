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
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/authStore';
import TopBar from '@/components/TopBar';
import PrimaryButton from '@/components/PrimaryButton';

/**
 * Reset Password screen — the user arrives here after tapping the
 * link in the password reset email.
 *
 * By this point, the deep link handler in _layout.tsx has already:
 * 1. Extracted the tokens from the URL
 * 2. Called supabase.auth.setSession() to verify the user
 * 3. Detected the PASSWORD_RECOVERY event and navigated here
 *
 * So the user has a temporary session. They just need to pick
 * a new password and we call authService.updatePassword().
 *
 * Think of it like: the hotel verified your identity (via the email link),
 * and now you're at the front desk picking a new keycard.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordsMatch = newPassword === confirmPassword;
  const isLongEnough = newPassword.length >= 6;
  const isFormValid = isLongEnough && passwordsMatch && confirmPassword.length > 0;

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setError(null);
    setIsLoading(true);

    try {
      await authService.updatePassword(newPassword);

      // Password updated! Navigate into the app.
      // Check if this user has completed onboarding to decide where to go.
      const { hasCompletedOnboarding } = useAuthStore.getState();
      if (hasCompletedOnboarding) {
        router.replace('/(main)/(tabs)/home');
      } else {
        router.replace('/(onboarding)/add-child');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      // Common: link expired or already used
      if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('invalid')) {
        setError('This link has expired. Please request a new one.');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* No back button — user arrived via deep link, there's nowhere to go back to */}
      <TopBar title="Set New Password" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Choose a new password for your account.
        </Text>

        {/* New Password field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showNewPassword}
              autoComplete="new-password"
              editable={!isLoading}
              autoFocus
            />
            <Pressable
              onPress={() => setShowNewPassword(!showNewPassword)}
              hitSlop={hitSlop.icon}
              style={styles.eyeButton}
            >
              <MaterialIcons
                name={showNewPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
          {newPassword.length > 0 && !isLongEnough && (
            <Text style={styles.hint}>Must be at least 6 characters</Text>
          )}
        </View>

        {/* Confirm Password field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your new password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
              editable={!isLoading}
            />
            <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              hitSlop={hitSlop.icon}
              style={styles.eyeButton}
            >
              <MaterialIcons
                name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <Text style={styles.hint}>Passwords don't match</Text>
          )}
        </View>

        {/* Error message */}
        {error && <Text style={styles.error}>{error}</Text>}

        {/* Submit button */}
        <View style={styles.buttonWrap}>
          <PrimaryButton
            label={isLoading ? 'Updating...' : 'Update Password'}
            onPress={handleSubmit}
            disabled={!isFormValid || isLoading}
          />
        </View>
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
  hint: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing(1),
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing(4),
  },
  buttonWrap: {
    marginTop: spacing(2),
  },
});
