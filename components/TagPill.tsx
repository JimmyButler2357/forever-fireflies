import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, radii, hitSlop } from '@/constants/theme';

interface TagPillProps {
  label: string;
  onRemove?: () => void;
}

/**
 * Small tag pill for entry metadata.
 * Uniform treatment — no color-coding by tag type.
 */
export default function TagPill({ label, onRemove }: TagPillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{label}</Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={hitSlop.icon}>
          <Text style={styles.removeIcon}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tag,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    gap: 4,
  },
  label: {
    ...typography.tag,
    color: colors.textSoft,
  },
  removeIcon: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
