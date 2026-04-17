import { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, radii, shadows } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import SectionLabel from './SectionLabel';
import type { Entry } from '@/stores/entriesStore';

/**
 * Mon–Sun dot tracker showing recording activity for the current week.
 *
 * Think of it like a row of little lights — each one glows gold
 * when you recorded a memory that day. It's a gentle nudge, not
 * a guilt trip. All dots unlit is fine.
 */

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DOT_SIZE = 12;
const PULSE_DURATION = 3000;

/** Get the Monday of the current week as YYYY-MM-DD */
function getMondayOfWeek(): Date {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day; // days to subtract to get Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Format a Date as YYYY-MM-DD (local time) */
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function PulseDot({ isLit, isToday }: { isLit: boolean; isToday: boolean }) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isLit && !reduceMotion) {
      scale.value = withRepeat(
        withTiming(1.15, { duration: PULSE_DURATION, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [isLit, reduceMotion]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Determine dot style based on state
  const dotStyle = isLit
    ? [
        styles.dot,
        styles.dotLit,
        isToday && styles.dotTodayLit,
      ]
    : [
        styles.dot,
        isToday ? styles.dotTodayEmpty : styles.dotUnlit,
      ];

  return (
    <Animated.View style={[dotStyle, isLit && animStyle]} />
  );
}

export default function WeekStreaks({ entries }: { entries: Entry[] }) {
  const monday = useMemo(() => getMondayOfWeek(), []);

  // Build a Set of date strings that have entries this week
  const entryDates = useMemo(() => {
    const dates = new Set<string>();
    const mondayStr = toDateString(monday);
    const sundayDate = new Date(monday);
    sundayDate.setDate(monday.getDate() + 6);
    const sundayStr = toDateString(sundayDate);

    for (const entry of entries) {
      if (!entry.isDeleted && entry.date >= mondayStr && entry.date <= sundayStr) {
        dates.add(entry.date);
      }
    }
    return dates;
  }, [entries, monday]);

  const todayStr = toDateString(new Date());

  return (
    <View style={styles.container}>
      <SectionLabel label="This week" />
      <View style={styles.card}>
        <View style={styles.row}>
          {DAY_LABELS.map((label, i) => {
            const dayDate = new Date(monday);
            dayDate.setDate(monday.getDate() + i);
            const dateStr = toDateString(dayDate);
            const isLit = entryDates.has(dateStr);
            const isToday = dateStr === todayStr;

            return (
              <View key={i} style={styles.column}>
                <PulseDot isLit={isLit} isToday={isToday} />
                <Text style={styles.dayLabel}>{label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing(4),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(4),
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  column: {
    alignItems: 'center',
    gap: spacing(2),
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dotUnlit: {
    backgroundColor: colors.border,
  },
  dotLit: {
    backgroundColor: colors.glow,
    shadowColor: colors.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 2,
  },
  dotTodayEmpty: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
  },
  dotTodayLit: {
    backgroundColor: colors.glow,
    borderWidth: 2,
    borderColor: colors.glow,
  },
});
