import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '@/constants/theme';

/**
 * A friendly error state that matches the visual pattern of our empty states.
 *
 * Think of it like a "something went wrong" page — an icon, a message,
 * and optionally a button to try again or take an action.
 */

interface ErrorStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function ErrorState({
  icon = 'alert-circle-outline',
  title,
  body,
  actionLabel,
  onAction,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.button,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing(16),
    paddingHorizontal: spacing(8),
    gap: spacing(3),
  },
  title: {
    ...typography.sectionHeading,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    ...typography.formLabel,
    color: colors.textSoft,
    textAlign: 'center',
    lineHeight: 21,
  },
  button: {
    marginTop: spacing(2),
    backgroundColor: colors.accent,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(6),
    borderRadius: radii.card,
  },
  buttonText: {
    ...typography.buttonLabel,
    color: colors.card,
  },
});
