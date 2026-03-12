import React from 'react';
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
  typography,
  spacing,
  radii,
} from '@/constants/theme';
import { DATE_RANGES } from '@/hooks/useSearchFilter';

interface FilterChipsProps {
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  allLocations?: string[];
  selectedLocations?: string[];
  onToggleLocation?: (location: string) => void;
  dateRangeIndex: number | null;
  onToggleDatePicker: () => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
}

export default function FilterChips({
  allTags,
  selectedTags,
  onToggleTag,
  allLocations = [],
  selectedLocations = [],
  onToggleLocation,
  dateRangeIndex,
  onToggleDatePicker,
  hasActiveFilters,
  onClearAll,
}: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {/* Tag chips */}
      {allTags.map((tag) => {
        const isActive = selectedTags.includes(tag);
        return (
          <Pressable
            key={tag}
            onPress={() => onToggleTag(tag)}
            style={[
              styles.chip,
              isActive ? styles.chipActiveTag : styles.chipInactive,
            ]}
          >
            <Text
              style={[
                styles.chipLabel,
                { color: isActive ? colors.accent : colors.textMuted },
              ]}
            >
              {tag}
            </Text>
          </Pressable>
        );
      })}

      {/* Divider between tags and locations */}
      {allTags.length > 0 && allLocations.length > 0 && <View style={styles.divider} />}

      {/* Location chips */}
      {allLocations.map((location) => {
        const isActive = selectedLocations.includes(location);
        return (
          <Pressable
            key={`loc-${location}`}
            onPress={() => onToggleLocation?.(location)}
            style={[
              styles.chip,
              isActive ? styles.chipActiveTag : styles.chipInactive,
            ]}
          >
            <Ionicons
              name="location-outline"
              size={13}
              color={isActive ? colors.accent : colors.textMuted}
            />
            <Text
              style={[
                styles.chipLabel,
                { color: isActive ? colors.accent : colors.textMuted },
              ]}
            >
              {location}
            </Text>
          </Pressable>
        );
      })}

      {/* Divider before date chip */}
      {(allTags.length > 0 || allLocations.length > 0) && <View style={styles.divider} />}

      {/* Date range chip */}
      <Pressable
        onPress={onToggleDatePicker}
        style={[
          styles.chip,
          dateRangeIndex !== null ? styles.chipActiveTag : styles.chipInactive,
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={13}
          color={dateRangeIndex !== null ? colors.accent : colors.textMuted}
        />
        <Text
          style={[
            styles.chipLabel,
            { color: dateRangeIndex !== null ? colors.accent : colors.textMuted },
          ]}
        >
          {dateRangeIndex !== null ? DATE_RANGES[dateRangeIndex].label : 'Date'}
        </Text>
      </Pressable>

      {/* Clear all chip */}
      {hasActiveFilters && (
        <Pressable
          onPress={onClearAll}
          style={[styles.chip, styles.chipClear]}
        >
          <Ionicons name="close" size={12} color={colors.textSoft} />
          <Text style={[styles.chipLabel, { color: colors.textSoft }]}>
            Clear
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  row: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    gap: spacing(2),
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: 1.5,
    gap: 5,
  },
  chipInactive: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  chipActiveTag: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipClear: {
    backgroundColor: colors.tag,
    borderColor: 'transparent',
  },
  chipLabel: {
    ...typography.tag,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: spacing(1),
  },
});
