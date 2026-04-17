import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fonts, childColors } from '@/constants/theme';
import { getMonthGrid, getTodayStr } from './calendarUtils';
import DayCell from './DayCell';
import type { Entry } from '@/stores/entriesStore';
import type { Child } from '@/stores/childrenStore';

/**
 * Month header (arrows + "April 2026") plus the 6x7 day grid.
 *
 * Think of it like a paper calendar page — the header lets you
 * flip forward and backward, and the grid shows which days
 * have entries via colored dots.
 */

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed (0 = January)
  entriesByDate: Map<string, Entry[]>;
  childMap: Record<string, Child>;
  onDayPress: (date: string, entries: Entry[]) => void;
  onMonthChange: (year: number, month: number) => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

export default function MonthGrid({
  year,
  month,
  entriesByDate,
  childMap,
  onDayPress,
  onMonthChange,
  canGoBack,
  canGoForward,
}: MonthGridProps) {
  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);
  const todayStr = getTodayStr();

  // Format month name: "April 2026"
  const monthLabel = useMemo(() => {
    const d = new Date(year, month, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [year, month]);

  const handlePrev = () => {
    if (!canGoBack) return;
    const prev = month === 0 ? { y: year - 1, m: 11 } : { y: year, m: month - 1 };
    onMonthChange(prev.y, prev.m);
  };

  const handleNext = () => {
    if (!canGoForward) return;
    const next = month === 11 ? { y: year + 1, m: 0 } : { y: year, m: month + 1 };
    onMonthChange(next.y, next.m);
  };

  return (
    <View style={styles.container}>
      {/* Month header with nav arrows */}
      <View style={styles.header}>
        <Pressable
          onPress={handlePrev}
          hitSlop={12}
          style={({ pressed }) => [
            styles.arrow,
            !canGoBack && styles.arrowDisabled,
            pressed && canGoBack && { opacity: 0.6 },
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={colors.textSoft}
          />
        </Pressable>

        <Text style={styles.monthLabel}>{monthLabel}</Text>

        <Pressable
          onPress={handleNext}
          hitSlop={12}
          style={({ pressed }) => [
            styles.arrow,
            !canGoForward && styles.arrowDisabled,
            pressed && canGoForward && { opacity: 0.6 },
          ]}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSoft}
          />
        </Pressable>
      </View>

      {/* Weekday labels: S M T W T F S */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((label, i) => (
          <Text key={i} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      {/* 6-row grid of day cells */}
      {grid.map((week, rowIdx) => (
        <View key={rowIdx} style={styles.weekRow}>
          {week.map((cell) => {
            const dayEntries = entriesByDate.get(cell.date) ?? [];
            const dots = getUniqueDots(dayEntries, childMap);

            return (
              <DayCell
                key={cell.date}
                day={cell.day}
                isCurrentMonth={cell.isCurrentMonth}
                isToday={cell.date === todayStr}
                dots={dots}
                hasEntries={dayEntries.length > 0}
                onPress={() => onDayPress(cell.date, dayEntries)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * Collect up to 3 unique child colors for a day's entries.
 *
 * If two entries belong to the same child, we only show
 * one dot for that child (avoids duplicate colors).
 */
function getUniqueDots(
  entries: Entry[],
  childMap: Record<string, Child>,
): string[] {
  if (entries.length === 0) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of entries) {
    for (const childId of entry.childIds) {
      if (seen.has(childId)) continue;
      seen.add(childId);

      const child = childMap[childId];
      const hex = child
        ? childColors[child.colorIndex]?.hex ?? childColors[0].hex
        : colors.textMuted;
      result.push(hex);

      if (result.length >= 3) return result;
    }
  }

  return result;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing(4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(3),
  },
  arrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  monthLabel: {
    fontFamily: fonts.serifBold,
    fontSize: 16,
    color: colors.text,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing(1),
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 2,
  },
});
