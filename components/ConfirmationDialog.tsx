import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, radii, shadows, spacing } from '@/constants/theme';

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
}

/**
 * Full-screen overlay dialog for destructive actions and confirmations.
 * Two buttons: Cancel (neutral) and confirm (accent or danger).
 */
export default function ConfirmationDialog({
  visible,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmationDialogProps) {
  const confirmColor = variant === 'danger' ? colors.danger : colors.accent;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, shadows.lg]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.buttons}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: confirmColor },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.confirmLabel}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing(5),
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(6),
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
    marginBottom: spacing(2),
  },
  body: {
    ...typography.formLabel,
    color: colors.textSoft,
    lineHeight: 21,
    marginBottom: spacing(6),
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing(3),
  },
  button: {
    flex: 1,
    paddingVertical: spacing(3),
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.tag,
  },
  cancelLabel: {
    ...typography.buttonLabel,
    color: colors.textSoft,
  },
  confirmLabel: {
    ...typography.buttonLabel,
    color: colors.card,
  },
});
