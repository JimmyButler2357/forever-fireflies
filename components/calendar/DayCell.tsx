import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radii } from '@/constants/theme';

/**
 * A single cell in the month grid.
 *
 * Shows the day number and up to 3 child-colored dots
 * representing entries on that date. Today gets a soft
 * accent background highlight.
 */

interface DayCellProps {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  /** Up to 3 unique child color hex strings */
  dots: string[];
  hasEntries: boolean;
  onPress: () => void;
}

function DayCell({ day, isCurrentMonth, isToday, dots, hasEntries, onPress }: DayCellProps) {
  return (
    <Pressable
      onPress={hasEntries ? onPress : undefined}
      style={({ pressed }) => [
        styles.cell,
        isToday && styles.todayBg,
        hasEntries && pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          styles.dayNumber,
          !isCurrentMonth && styles.overflow,
          isToday && styles.todayText,
        ]}
      >
        {day}
      </Text>

      {/* Entry dots — max 3, colored by child */}
      {dots.length > 0 && (
        <View style={styles.dotsRow}>
          {dots.map((color, i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: color }]}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

export default memo(DayCell);

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  todayBg: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  overflow: {
    opacity: 0.4,
  },
  todayText: {
    color: colors.accent,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    height: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
