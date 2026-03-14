import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radii,
} from '@/constants/theme';
import ScrollColumn from '@/components/ScrollColumn';

// ─── Data ────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 20 }, (_, i) => currentYear - i);

// ─── BirthdayPicker ──────────────────────────────────────

export function formatBirthdayDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

interface BirthdayPickerProps {
  /** Current value as ISO date string (e.g. "2020-03-15"). Empty = not set. */
  value?: string;
  /** Called when user confirms a date selection */
  onChange: (isoDate: string) => void;
}

export default function BirthdayPicker({ value, onChange }: BirthdayPickerProps) {
  const hasValue = !!value;
  const [showPicker, setShowPicker] = useState(false);

  // Parse initial indices from value (or default to 0)
  const initMonth = value ? parseInt(value.split('-')[1], 10) - 1 : 0;
  const initDay = value ? parseInt(value.split('-')[2], 10) - 1 : 0;
  const initYear = value ? YEARS.indexOf(parseInt(value.split('-')[0], 10)) : 0;

  const [selectedMonth, setSelectedMonth] = useState(Math.max(0, initMonth));
  const [selectedDay, setSelectedDay] = useState(Math.max(0, initDay));
  const [selectedYear, setSelectedYear] = useState(Math.max(0, initYear));

  const daysInMonth = getDaysInMonth(selectedMonth, YEARS[selectedYear]);

  const handleSetBirthday = () => {
    const month = selectedMonth + 1;
    const day = Math.min(selectedDay + 1, daysInMonth);
    const year = YEARS[selectedYear];
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setShowPicker(false);
  };

  if (hasValue && !showPicker) {
    return (
      <Pressable onPress={() => { Keyboard.dismiss(); setShowPicker(true); }} style={styles.birthdayRow}>
        <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
        <Text style={styles.birthdayValue}>{formatBirthdayDisplay(value!)}</Text>
        <Text style={styles.changeLink}>change</Text>
      </Pressable>
    );
  }

  if (!showPicker) {
    return (
      <Pressable onPress={() => { Keyboard.dismiss(); setShowPicker(true); }}>
        <Text style={styles.birthdayPlaceholder}>Tap to set birthday</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.pickerContainer}>
      <View style={styles.pickerColumns}>
        <View style={{ flex: 35 }}>
          <ScrollColumn
            items={MONTHS}
            selectedIndex={selectedMonth}
            onSelect={setSelectedMonth}
          />
        </View>
        <View style={{ flex: 25 }}>
          <ScrollColumn
            items={Array.from({ length: daysInMonth }, (_, i) => String(i + 1))}
            selectedIndex={Math.min(selectedDay, daysInMonth - 1)}
            onSelect={setSelectedDay}
          />
        </View>
        <View style={{ flex: 30 }}>
          <ScrollColumn
            items={YEARS.map(String)}
            selectedIndex={selectedYear}
            onSelect={setSelectedYear}
          />
        </View>
      </View>
      <Pressable
        onPress={handleSetBirthday}
        style={({ pressed }) => [
          styles.setBirthdayBtn,
          pressed && { backgroundColor: colors.accentPressed },
        ]}
      >
        <Text style={styles.setBirthdayLabel}>Set birthday</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  birthdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    paddingVertical: spacing(2),
  },
  birthdayValue: {
    ...typography.formLabel,
    color: colors.text,
    flex: 1,
  },
  changeLink: {
    ...typography.caption,
    color: colors.accent,
  },
  birthdayPlaceholder: {
    ...typography.formLabel,
    color: colors.textMuted,
    paddingVertical: spacing(2),
  },
  pickerContainer: {
    marginTop: spacing(3),
    gap: spacing(3),
  },
  pickerColumns: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  setBirthdayBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing(3),
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  setBirthdayLabel: {
    ...typography.buttonLabel,
    color: colors.card,
  },
});
