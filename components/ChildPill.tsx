import { View, Text, Pressable, StyleSheet } from 'react-native';
import { typography, radii, spacing, hitSlop } from '@/constants/theme';
import { childColorWithOpacity } from '@/constants/theme';

interface ChildPillProps {
  name: string;
  color: string;
  onRemove?: () => void;
  showRemove?: boolean;
}

/**
 * Colored pill showing a child's name with a dot indicator.
 * Used in entry metadata rows and on entry cards.
 */
export default function ChildPill({
  name,
  color,
  onRemove,
  showRemove = false,
}: ChildPillProps) {
  return (
    <View style={[styles.pill, { backgroundColor: childColorWithOpacity(color, 0.12) }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.name, { color }]}>{name}</Text>
      {showRemove && onRemove && (
        <Pressable onPress={onRemove} hitSlop={hitSlop.icon} style={styles.removeButton}>
          <Text style={[styles.removeIcon, { color }]}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    gap: spacing(1),
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    marginLeft: spacing(1),
  },
  removeIcon: {
    fontSize: 11,
    opacity: 0.6,
    fontWeight: '700',
  },
});
