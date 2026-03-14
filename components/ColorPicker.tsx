import { View, Pressable, Text, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  childColors,
  childColorWithOpacity,
  minTouchTarget,
} from '@/constants/theme';

interface ColorPickerProps {
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function ColorPicker({ selectedIndex, onSelect }: ColorPickerProps) {
  return (
    <View style={styles.container}>
      {childColors.map((color, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Pressable
            key={color.name}
            onPress={() => { Keyboard.dismiss(); onSelect(i); }}
            style={styles.touchTarget}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: color.hex },
                isSelected && {
                  borderWidth: 2.5,
                  borderColor: colors.text,
                },
              ]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
            <Text
              style={[
                styles.label,
                isSelected && styles.labelSelected,
              ]}
            >
              {color.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const SWATCH_SIZE = 36;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing(2),
    flexWrap: 'wrap',
  },
  touchTarget: {
    alignItems: 'center',
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    gap: spacing(1),
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
  },
  labelSelected: {
    color: colors.text,
    fontWeight: '700',
  },
});
