import { Text, StyleSheet } from 'react-native';
import { colors, spacing } from '@/constants/theme';

/**
 * Uppercase section header used across the Home dashboard.
 * Renders labels like "YOUR FAMILY", "ON THIS DAY", etc.
 */
export default function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.label}>{label}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
    paddingHorizontal: spacing(4),
    marginBottom: spacing(3),
  },
});
