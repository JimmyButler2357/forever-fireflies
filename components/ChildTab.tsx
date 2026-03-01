import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors, typography, radii, shadows, spacing } from '@/constants/theme';
import { childColorWithOpacity } from '@/constants/theme';

interface ChildTabProps {
  label: string;
  color: string;
  active: boolean;
  onPress: () => void;
  showDot?: boolean;
}

/**
 * Horizontal scrollable filter tab for child selection.
 * Used on Home and Core Memories screens.
 * "All" tab uses colors.general (#B5AAA0) and showDot={false}.
 */
export default function ChildTab({ label, color, active, onPress, showDot = true }: ChildTabProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        active
          ? [
              styles.tabActive,
              {
                borderColor: color,
                backgroundColor: childColorWithOpacity(color, 0.12),
                shadowColor: color,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.18,
                shadowRadius: 8,
                elevation: 2,
              },
            ]
          : [styles.tabInactive, shadows.tabInactive],
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.tabContent}>
        {showDot && (
          <View
            style={[
              styles.dot,
              { backgroundColor: color },
            ]}
          />
        )}
        <Text
          style={[
            styles.label,
            { color: active ? color : colors.textMuted },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tab: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 2,
  },
  tabActive: {
    // borderColor and backgroundColor set dynamically
  },
  tabInactive: {
    borderColor: 'transparent',
    backgroundColor: colors.card,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    ...typography.tabLabel,
  },
});
