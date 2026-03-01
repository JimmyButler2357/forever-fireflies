import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  childColors,
  childColorWithOpacity,
  hitSlop,
  minTouchTarget,
} from '@/constants/theme';
import { useChildrenStore, type Child } from '@/stores/childrenStore';
import { useEntriesStore, type Entry } from '@/stores/entriesStore';
import EntryCard from '@/components/EntryCard';
import TopBar from '@/components/TopBar';

// ─── Helpers ──────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Date range presets for the date filter */
const DATE_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 3 months', days: 90 },
  { label: 'All time', days: null },
] as const;

/** Collect all unique tags from entries for the tag filter chips */
function collectTags(entries: Entry[]): string[] {
  const tagSet = new Set<string>();
  entries.forEach((e) => {
    if (!e.isDeleted) {
      e.tags.forEach((t) => tagSet.add(t));
    }
  });
  return Array.from(tagSet).sort();
}

// ─── Search Screen ────────────────────────────────────────

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const children = useChildrenStore((s) => s.children);
  const entries = useEntriesStore((s) => s.entries);
  const inputRef = useRef<TextInput>(null);

  // State
  const [query, setQuery] = useState('');
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateRangeIndex, setDateRangeIndex] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Build child lookup
  const childMap = useMemo(() => {
    const map: Record<string, Child> = {};
    children.forEach((c) => (map[c.id] = c));
    return map;
  }, [children]);

  // Unique tags from all active entries
  const allTags = useMemo(() => collectTags(entries), [entries]);

  // Active (non-deleted) entries
  const activeEntries = useMemo(
    () => entries.filter((e) => !e.isDeleted),
    [entries],
  );

  // Filtered + searched entries
  const results = useMemo(() => {
    let filtered = activeEntries;

    // Filter by selected children
    if (selectedChildIds.length > 0) {
      filtered = filtered.filter((e) =>
        e.childIds.some((id) => selectedChildIds.includes(id)),
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((e) =>
        e.tags.some((t) => selectedTags.includes(t)),
      );
    }

    // Filter by date range
    if (dateRangeIndex !== null) {
      const range = DATE_RANGES[dateRangeIndex];
      if (range.days !== null) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - range.days);
        filtered = filtered.filter((e) => new Date(e.date) >= cutoff);
      }
    }

    // Search by text (case-insensitive substring)
    const trimmed = query.trim().toLowerCase();
    if (trimmed) {
      filtered = filtered.filter((e) =>
        e.text.toLowerCase().includes(trimmed),
      );
    }

    return filtered;
  }, [activeEntries, selectedChildIds, selectedTags, dateRangeIndex, query]);

  // ─── Toggle Helpers ────────────────────────────────────

  const toggleChild = (id: string) => {
    setSelectedChildIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const toggleDateRange = (index: number) => {
    if (dateRangeIndex === index) {
      // Deselect
      setDateRangeIndex(null);
      setShowDatePicker(false);
    } else {
      setDateRangeIndex(index);
      setShowDatePicker(false);
    }
  };

  // ─── Map Entry to EntryCard format ─────────────────────

  const entryToCard = (entry: Entry) => {
    const childNames = entry.childIds.map((id) => childMap[id]?.name ?? 'Unknown');
    const entryChildColors = entry.childIds.map(
      (id) => childColors[childMap[id]?.colorIndex ?? 0]?.hex ?? colors.textMuted,
    );
    return {
      childNames,
      childColors: entryChildColors,
      date: formatDate(entry.date),
      time: formatTime(entry.date),
      preview: entry.text,
      tags: entry.tags,
      isFavorited: entry.isFavorited,
      hasAudio: entry.hasAudio,
    };
  };

  // ─── Check if any filters are active ───────────────────

  const hasActiveFilters =
    selectedChildIds.length > 0 ||
    selectedTags.length > 0 ||
    dateRangeIndex !== null;

  const clearAll = () => {
    setQuery('');
    setSelectedChildIds([]);
    setSelectedTags([]);
    setDateRangeIndex(null);
    setShowDatePicker(false);
  };

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <TopBar title="Search" showBack />

      {/* Search input */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search your memories..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={hitSlop.icon}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {/* Child chips */}
        {children.map((child) => {
          const isActive = selectedChildIds.includes(child.id);
          const hex = childColors[child.colorIndex]?.hex ?? childColors[0].hex;
          return (
            <Pressable
              key={child.id}
              onPress={() => toggleChild(child.id)}
              style={[
                styles.chip,
                isActive
                  ? {
                      backgroundColor: childColorWithOpacity(hex, 0.15),
                      borderColor: hex,
                    }
                  : styles.chipInactive,
              ]}
            >
              <View
                style={[
                  styles.chipDot,
                  { backgroundColor: hex },
                ]}
              />
              <Text
                style={[
                  styles.chipLabel,
                  { color: isActive ? hex : colors.textMuted },
                ]}
              >
                {child.name}
              </Text>
            </Pressable>
          );
        })}

        {/* Divider between child chips and tag chips */}
        {children.length > 0 && allTags.length > 0 && (
          <View style={styles.chipDivider} />
        )}

        {/* Tag chips */}
        {allTags.map((tag) => {
          const isActive = selectedTags.includes(tag);
          return (
            <Pressable
              key={tag}
              onPress={() => toggleTag(tag)}
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

        {/* Divider before date chip */}
        {allTags.length > 0 && <View style={styles.chipDivider} />}

        {/* Date range chip */}
        <Pressable
          onPress={() => setShowDatePicker((prev) => !prev)}
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
              {
                color:
                  dateRangeIndex !== null ? colors.accent : colors.textMuted,
              },
            ]}
          >
            {dateRangeIndex !== null
              ? DATE_RANGES[dateRangeIndex].label
              : 'Date'}
          </Text>
        </Pressable>

        {/* Clear all chip */}
        {hasActiveFilters && (
          <Pressable
            onPress={clearAll}
            style={[styles.chip, styles.chipClear]}
          >
            <Ionicons name="close" size={12} color={colors.textSoft} />
            <Text style={[styles.chipLabel, { color: colors.textSoft }]}>
              Clear
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Date range preset picker (expandable) */}
      {showDatePicker && (
        <View style={styles.datePickerRow}>
          {DATE_RANGES.map((range, i) => {
            const isActive = dateRangeIndex === i;
            return (
              <Pressable
                key={range.label}
                onPress={() => toggleDateRange(i)}
                style={[
                  styles.dateOption,
                  isActive && styles.dateOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.dateOptionLabel,
                    isActive && styles.dateOptionLabelActive,
                  ]}
                >
                  {range.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Results list */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing(8) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => (
          <EntryCard
            entry={entryToCard(item)}
            index={index}
            onPress={() => router.push('/(main)/entry-detail')}
            highlightQuery={query.trim()}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing(3) }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="search-outline"
              size={48}
              color={colors.textMuted}
            />
            <Text style={styles.emptyHeading}>
              {query.trim() || hasActiveFilters
                ? 'No memories found'
                : 'Search your memories'}
            </Text>
            <Text style={styles.emptyBody}>
              {query.trim() || hasActiveFilters
                ? 'Try different keywords or filters.'
                : 'Type a word or pick a filter to find specific memories.'}
            </Text>
          </View>
        }
      />

      {/* Result count bar (when there are results and a query/filter) */}
      {(query.trim() || hasActiveFilters) && results.length > 0 && (
        <View style={[styles.resultCount, { bottom: insets.bottom + spacing(6) }]}>
          <Text style={styles.resultCountText}>
            {results.length} {results.length === 1 ? 'memory' : 'memories'} found
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // ─── Search Input ───────────────────
  searchRow: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    ...shadows.sm,
  },
  searchIcon: {
    marginRight: spacing(2),
  },
  searchInput: {
    flex: 1,
    ...typography.formLabel,
    color: colors.text,
    paddingVertical: 10,
  },
  clearButton: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─── Filter Chips ────────────────────
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
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
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipLabel: {
    ...typography.tag,
    fontWeight: '600',
  },
  chipDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: spacing(1),
  },
  // ─── Date Picker ─────────────────────
  datePickerRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    gap: spacing(2),
    flexWrap: 'wrap',
  },
  dateOption: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderRadius: radii.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateOptionActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  dateOptionLabel: {
    ...typography.caption,
    color: colors.textSoft,
  },
  dateOptionLabelActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  // ─── Results List ────────────────────
  list: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(8),
    flexGrow: 1,
  },
  // ─── Empty State ─────────────────────
  empty: {
    alignItems: 'center',
    paddingTop: spacing(16),
    gap: spacing(3),
  },
  emptyHeading: {
    ...typography.sectionHeading,
    color: colors.text,
  },
  emptyBody: {
    ...typography.formLabel,
    color: colors.textSoft,
    textAlign: 'center',
    paddingHorizontal: spacing(4),
  },
  // ─── Result Count ────────────────────
  resultCount: {
    position: 'absolute',
    bottom: spacing(6),
    alignSelf: 'center',
    backgroundColor: colors.text,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    borderRadius: radii.full,
    ...shadows.md,
  },
  resultCountText: {
    ...typography.caption,
    color: colors.card,
    fontWeight: '600',
  },
});
