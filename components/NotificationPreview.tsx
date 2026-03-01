import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  screenColors,
} from '@/constants/theme';

interface NotificationPreviewProps {
  childName?: string;
  age?: string; // e.g. "2 years"
}

/**
 * Styled preview of the nightly push notification.
 * Visual demo only — not a real notification.
 *
 * Shows: app icon, title, "now" timestamp, personalized
 * prompt, child age line, and two action buttons.
 */
export default function NotificationPreview({
  childName = 'Emma',
  age = '2 years',
}: NotificationPreviewProps) {
  return (
    <View style={styles.container}>
      {/* Frosted glass card */}
      <View style={[styles.card, shadows.md]}>
        {/* Header row — app icon + name + timestamp */}
        <View style={styles.header}>
          <View style={styles.appIcon}>
            <Ionicons name="mic" size={16} color={colors.card} />
          </View>
          <Text style={styles.appName}>Core Memories</Text>
          <Text style={styles.timestamp}>now</Text>
        </View>

        {/* Prompt text */}
        <Text style={styles.promptText}>
          What made {childName} smile today?
        </Text>

        {/* Age line */}
        <Text style={styles.ageLine}>
          {childName} is {age} old — these days go fast.
        </Text>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable style={[styles.actionButton, styles.recordButton]}>
            <Ionicons name="mic" size={14} color={colors.card} />
            <Text style={styles.recordLabel}>Record</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.laterButton]}>
            <Text style={styles.laterLabel}>Remind me later</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(3),
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radii.pill,
    paddingVertical: spacing(4),
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // ─── Header ────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
    gap: spacing(2),
  },
  appIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    ...typography.pillLabel,
    color: colors.text,
    flex: 1,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textMuted,
  },
  // ─── Content ───────────────────────────
  promptText: {
    ...typography.formLabel,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing(1),
  },
  ageLine: {
    ...typography.timestamp,
    color: colors.textSoft,
    marginBottom: spacing(3),
  },
  // ─── Actions ───────────────────────────
  actions: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    paddingVertical: 9,
    paddingHorizontal: spacing(4),
    borderRadius: 10,
  },
  recordButton: {
    backgroundColor: colors.accent,
  },
  recordLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.card,
  },
  laterButton: {
    backgroundColor: colors.tag,
  },
  laterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSoft,
  },
});
