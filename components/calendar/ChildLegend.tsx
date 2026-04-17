import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, childColors } from '@/constants/theme';
import type { Child } from '@/stores/childrenStore';

/**
 * Row of colored dots + child names below the calendar grid.
 *
 * Acts as a legend so parents know which dot color
 * belongs to which child (e.g., blue = Emma, amber = Liam).
 */

export default function ChildLegend({ children }: { children: Child[] }) {
  if (children.length === 0) return null;

  return (
    <View style={styles.container}>
      {children.map((child) => {
        const hex = childColors[child.colorIndex]?.hex ?? childColors[0].hex;
        return (
          <View key={child.id} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: hex }]} />
            <Text style={styles.name}>{child.name}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing(4),
    paddingHorizontal: spacing(4),
    paddingTop: spacing(4),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  name: {
    fontSize: 11,
    color: colors.textSoft,
  },
});
