import { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii } from '@/constants/theme';
import ScrollColumn from '@/components/ScrollColumn';

// 12-hour clock: 1, 2, 3, ... 12
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));

// 5-minute intervals: 00, 05, 10, ... 55
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, '0'),
);

const PERIODS = ['AM', 'PM'];

/**
 * Parse a 12-hour display string like "8:30 PM" into column indices.
 *
 * Think of it like reading a clock face:
 * - Hour index: which number (1–12) the hour hand points to
 * - Minute index: which 5-minute mark the minute hand is on
 * - Period index: 0 for AM (morning), 1 for PM (afternoon/evening)
 */
function parseTime(display: string): { hourIdx: number; minuteIdx: number; periodIdx: number } {
  const [timePart, period] = display.split(' ');
  const [hourStr, minuteStr] = timePart.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  return {
    hourIdx: hour === 12 ? 11 : hour - 1,       // "12" → index 11, "1" → index 0
    minuteIdx: Math.round(minute / 5),            // "30" → index 6
    periodIdx: period === 'PM' ? 1 : 0,
  };
}

/** Build the display string from column indices */
function buildTime(h: number, m: number, p: number): string {
  return `${HOURS[h]}:${MINUTES[m]} ${PERIODS[p]}`;
}

interface TimePickerProps {
  /** Current time in 12-hour format, e.g. "8:30 PM" */
  value: string;
  /** Called when the user taps "Set time" to confirm their selection */
  onConfirm: (displayTime: string) => void;
  /** Called when the user taps "Cancel" */
  onCancel: () => void;
}

export default function TimePicker({ value, onConfirm, onCancel }: TimePickerProps) {
  const initial = parseTime(value);
  const [hourIdx, setHourIdx] = useState(initial.hourIdx);
  const [minuteIdx, setMinuteIdx] = useState(initial.minuteIdx);
  const [periodIdx, setPeriodIdx] = useState(initial.periodIdx);

  return (
    <View style={styles.container}>
      <View style={styles.columns}>
        <View style={{ flex: 30 }}>
          <ScrollColumn
            items={HOURS}
            selectedIndex={hourIdx}
            onSelect={setHourIdx}
            loop
          />
        </View>
        <View style={{ flex: 30 }}>
          <ScrollColumn
            items={MINUTES}
            selectedIndex={minuteIdx}
            onSelect={setMinuteIdx}
            loop
          />
        </View>
        <View style={{ flex: 25 }}>
          <ScrollColumn
            items={PERIODS}
            selectedIndex={periodIdx}
            onSelect={setPeriodIdx}
          />
        </View>
      </View>

      <View style={styles.buttons}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.confirmButton,
            pressed && styles.confirmButtonPressed,
          ]}
          onPress={() => onConfirm(buildTime(hourIdx, minuteIdx, periodIdx))}
        >
          <Text style={styles.confirmText}>Set time</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  columns: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing(2),
    marginTop: spacing(3),
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: spacing(4),
    borderRadius: radii.card,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSoft,
  },
  confirmButton: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: spacing(5),
    borderRadius: radii.card,
  },
  confirmButtonPressed: {
    backgroundColor: colors.accentPressed,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
