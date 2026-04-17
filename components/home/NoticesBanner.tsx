import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, minTouchTarget } from '@/constants/theme';

/**
 * NoticesBanner — a notices slot on the Home screen that appears
 * between the BrandingBanner and Your Family section.
 *
 * Think of it like a sticky note tucked inside the front cover of
 * a journal — only shows up when there's something worth saying,
 * and disappears once you deal with it.
 *
 * Only renders when there are active notices. Currently the only
 * notice type is "notification permission mismatch," but the
 * structure supports adding more later (app update, billing, etc.).
 */

export interface Notice {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  actionLabel: string;
  onAction: () => void;
}

interface NoticesBannerProps {
  notices: Notice[];
}

export default function NoticesBanner({ notices }: NoticesBannerProps) {
  if (notices.length === 0) return null;

  return (
    <View style={styles.container}>
      {notices.map((notice) => (
        <Pressable
          key={notice.id}
          onPress={notice.onAction}
          style={({ pressed }) => [
            styles.row,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name={notice.icon} size={16} color={colors.warning} />
          <Text style={styles.message} numberOfLines={1}>
            {notice.message}
          </Text>
          <Text style={styles.action}>{notice.actionLabel}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing(4),
    marginTop: spacing(3),
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(4),
    gap: spacing(2),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    minHeight: minTouchTarget,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
});
