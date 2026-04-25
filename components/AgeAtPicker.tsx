import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
} from '@/constants/theme';
import ScrollColumn from '@/components/ScrollColumn';
import { ageInMonthsAt } from '@/lib/dateUtils';

interface AgeAtPickerProps {
  visible: boolean;
  childName: string;
  /** Birthday ISO ("YYYY-MM-DD") used to determine the maximum picker year. */
  childBirthday: string;
  /** Currently selected year of life, if any. */
  initialYear?: number | null;
  onCancel: () => void;
  onConfirm: (year: number) => void;
}

/**
 * Modal picker for selecting a year of life ("Age 0", "Age 1", "Age 2"…).
 * The list is bounded by the child's current age — no point offering ages
 * the child hasn't reached.
 */
export default function AgeAtPicker({
  visible,
  childName,
  childBirthday,
  initialYear,
  onCancel,
  onConfirm,
}: AgeAtPickerProps) {
  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const maxYear = useMemo(() => {
    return Math.floor(ageInMonthsAt(childBirthday, todayIso) / 12);
  }, [childBirthday, todayIso]);

  const items = useMemo(
    () => Array.from({ length: maxYear + 1 }, (_, i) => `Age ${i}`),
    [maxYear],
  );

  const [selectedIndex, setSelectedIndex] = useState(
    initialYear != null ? Math.min(initialYear, maxYear) : 0,
  );

  // Reset to the latest initialYear each time the picker opens
  useEffect(() => {
    if (visible) {
      setSelectedIndex(initialYear != null ? Math.min(initialYear, maxYear) : 0);
    }
  }, [visible, initialYear, maxYear]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>How old was {childName}?</Text>
          <View style={styles.column}>
            <ScrollColumn
              items={items}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
            />
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.btn,
                styles.btnGhost,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.btnGhostLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(selectedIndex)}
              style={({ pressed }) => [
                styles.btn,
                styles.btnPrimary,
                pressed && { backgroundColor: colors.accentPressed },
              ]}
            >
              <Text style={styles.btnPrimaryLabel}>Show memories</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(6),
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(5),
    gap: spacing(4),
    ...shadows.lg,
  },
  title: {
    ...typography.sectionHeading,
    color: colors.text,
    textAlign: 'center',
  },
  column: {
    alignSelf: 'stretch',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  btn: {
    flex: 1,
    paddingVertical: spacing(3),
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  btnGhost: {
    backgroundColor: colors.tag,
  },
  btnGhostLabel: {
    ...typography.buttonLabel,
    color: colors.text,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
  },
  btnPrimaryLabel: {
    ...typography.buttonLabel,
    color: colors.card,
  },
});
