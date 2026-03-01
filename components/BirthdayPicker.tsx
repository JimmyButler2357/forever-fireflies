import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fonts,
  typography,
  spacing,
  radii,
} from '@/constants/theme';

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

// ─── Scroll Column ───────────────────────────────────────

const ROW_HEIGHT = 40;
const VISIBLE_ROWS = 3;
const COLUMN_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

interface ScrollColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function ScrollColumn({ items, selectedIndex, onSelect }: ScrollColumnProps) {
  const scrollRef = useRef<ScrollView>(null);

  const handleScrollEnd = useCallback((e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ROW_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    onSelect(clamped);
  }, [items.length, onSelect]);

  const handleLayout = useCallback(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * ROW_HEIGHT, animated: false });
  }, [selectedIndex]);

  return (
    <View style={columnStyles.wrapper}>
      <View style={columnStyles.highlightBand} />
      <View style={columnStyles.fadeTop} />
      <View style={columnStyles.fadeBottom} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_HEIGHT}
        decelerationRate="fast"
        onLayout={handleLayout}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: ROW_HEIGHT }}
      >
        {items.map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Pressable
              key={i}
              onPress={() => {
                onSelect(i);
                scrollRef.current?.scrollTo({ y: i * ROW_HEIGHT, animated: true });
              }}
              style={columnStyles.row}
            >
              <Text style={isSelected ? columnStyles.selectedText : columnStyles.unselectedText}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const columnStyles = StyleSheet.create({
  wrapper: {
    height: COLUMN_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  highlightBand: {
    position: 'absolute',
    top: ROW_HEIGHT,
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    zIndex: 0,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  row: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    fontFamily: fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  unselectedText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textMuted,
  },
});

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
      <Pressable onPress={() => setShowPicker(true)} style={styles.birthdayRow}>
        <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
        <Text style={styles.birthdayValue}>{formatBirthdayDisplay(value!)}</Text>
        <Text style={styles.changeLink}>change</Text>
      </Pressable>
    );
  }

  if (!showPicker) {
    return (
      <Pressable onPress={() => setShowPicker(true)}>
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
