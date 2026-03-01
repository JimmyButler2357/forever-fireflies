import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, typography, radii, spacing } from '@/constants/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'accent' | 'danger';
}

/**
 * Full-width call-to-action button.
 * Used in onboarding, modals, and forms.
 */
export default function PrimaryButton({
  label,
  onPress,
  disabled = false,
  variant = 'accent',
}: PrimaryButtonProps) {
  const bgColor = disabled
    ? colors.border
    : variant === 'danger'
      ? colors.danger
      : colors.accent;

  const pressedBgColor = variant === 'danger' ? colors.danger : colors.accentPressed;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed && !disabled ? pressedBgColor : bgColor },
      ]}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: radii.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.buttonLabel,
    color: colors.card,
  },
  labelDisabled: {
    color: colors.textMuted,
  },
});
