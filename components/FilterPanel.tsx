import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radii,
  childColors,
  minTouchTarget,
} from '@/constants/theme';
import FilterRow from '@/components/FilterRow';
import ChildTab from '@/components/ChildTab';
import AgeAtPicker from '@/components/AgeAtPicker';
import { AGE_RANGES, DATE_RANGES, type DateFilter } from '@/hooks/useSearchFilter';
import type { Child } from '@/stores/childrenStore';

interface FilterPanelProps {
  // Child filter
  children: Child[];
  activeChildId: string | null;
  onSelectChild: (id: string | null) => void;

  // Tag filter
  visibleTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;

  // Location filter
  allLocations: string[];
  selectedLocations: string[];
  onToggleLocation: (loc: string) => void;

  // Date filter
  availableYears: number[];
  /** The child whose birthday powers age filtering — the active child, or
   * the only child in single-child families. Undefined when ambiguous. */
  scopeChild?: Child;
  dateFilter: DateFilter;
  onSetDateFilter: (filter: DateFilter) => void;

  // Global
  hasActiveFilters: boolean;
  onClearAll: () => void;
}

type RowKey = 'date' | 'tags' | 'location';

/**
 * Vertical stack of labeled filter rows: Child / Date / Tags / Location.
 * Each row owns its own expand/collapse state and auto-collapses when a
 * selection is first made, so the user always sees a compact summary
 * without losing access to the full lane.
 */
export default function FilterPanel({
  children,
  activeChildId,
  onSelectChild,
  visibleTags,
  selectedTags,
  onToggleTag,
  allLocations,
  selectedLocations,
  onToggleLocation,
  availableYears,
  scopeChild,
  dateFilter,
  onSetDateFilter,
  hasActiveFilters,
  onClearAll,
}: FilterPanelProps) {
  const isMultiChild = children.length >= 2;

  // ─── Per-row expand/collapse state ──────────────────────
  const [expanded, setExpanded] = useState<Record<RowKey, boolean>>({
    date: true,
    tags: true,
    location: true,
  });

  // Track previous selection counts so we only auto-collapse on the
  // 0→1 transition (and auto-expand on 1→0). This lets the user manually
  // override via the chevron without us undoing them on every render.
  const prevDateActive = useRef<boolean>(dateFilter !== null);
  const prevTagsCount = useRef<number>(selectedTags.length);
  const prevLocsCount = useRef<number>(selectedLocations.length);

  useEffect(() => {
    const isActive = dateFilter !== null;
    if (isActive !== prevDateActive.current) {
      setExpanded((s) => ({ ...s, date: !isActive }));
      prevDateActive.current = isActive;
    }
  }, [dateFilter]);

  useEffect(() => {
    const isActive = selectedTags.length > 0;
    const wasActive = prevTagsCount.current > 0;
    if (isActive !== wasActive) {
      setExpanded((s) => ({ ...s, tags: !isActive }));
    }
    prevTagsCount.current = selectedTags.length;
  }, [selectedTags.length]);

  useEffect(() => {
    const isActive = selectedLocations.length > 0;
    const wasActive = prevLocsCount.current > 0;
    if (isActive !== wasActive) {
      setExpanded((s) => ({ ...s, location: !isActive }));
    }
    prevLocsCount.current = selectedLocations.length;
  }, [selectedLocations.length]);

  const toggleRow = useCallback((key: RowKey) => {
    setExpanded((s) => ({ ...s, [key]: !s[key] }));
  }, []);

  // ─── Age-at picker modal ─────────────────────────────────
  const [agePickerOpen, setAgePickerOpen] = useState(false);

  // ─── Helpers ─────────────────────────────────────────────

  const handlePreset = useCallback((index: number) => {
    onSetDateFilter({ kind: 'preset', index });
  }, [onSetDateFilter]);

  const handleYear = useCallback((year: number) => {
    onSetDateFilter({ kind: 'year', year });
  }, [onSetDateFilter]);

  const handleAgeRange = useCallback((fromMonths: number, toMonths: number) => {
    onSetDateFilter({ kind: 'ageRange', fromMonths, toMonths });
  }, [onSetDateFilter]);

  const handleAgeAtConfirm = useCallback((year: number) => {
    setAgePickerOpen(false);
    onSetDateFilter({ kind: 'ageAt', year });
  }, [onSetDateFilter]);

  const dateChipLabel = useMemo(() => {
    return formatDateChipLabel(dateFilter, scopeChild);
  }, [dateFilter, scopeChild]);

  const dateSelectionCount = dateFilter !== null ? 1 : 0;

  return (
    <View style={styles.panel}>
      {/* ─── Child row (always expanded) ───────────────── */}
      {isMultiChild && (
        <FilterRow
          label="Child"
          expanded
          onToggle={() => {}}
          collapsible={false}
        >
          <ChildTab
            label="All"
            color={colors.general}
            active={activeChildId === null}
            onPress={() => onSelectChild(null)}
            showDot={false}
          />
          {children.map((child) => (
            <ChildTab
              key={child.id}
              label={child.name}
              color={childColors[child.colorIndex]?.hex ?? childColors[0].hex}
              active={activeChildId === child.id}
              onPress={() => onSelectChild(child.id)}
            />
          ))}
        </FilterRow>
      )}

      {/* ─── Date row ──────────────────────────────────── */}
      <FilterRow
        label="Date"
        selectionCount={dateSelectionCount}
        expanded={expanded.date}
        onToggle={() => toggleRow('date')}
        summary={
          dateChipLabel ? (
            <ActiveChip
              label={dateChipLabel}
              onPress={() => onSetDateFilter(null)}
              icon="calendar-outline"
            />
          ) : null
        }
      >
        <DateLane
          dateFilter={dateFilter}
          availableYears={availableYears}
          scopeChild={scopeChild}
          onPreset={handlePreset}
          onYear={handleYear}
          onAgeRange={handleAgeRange}
          onOpenAgeAt={() => setAgePickerOpen(true)}
          onPickChild={() => {
            // Hint: nothing to do automatically; the parent screen handles
            // scrolling/pulsing the child row. Setting child to null keeps
            // the user in "All", inviting them to tap a child tab.
            onSelectChild(null);
          }}
        />
      </FilterRow>

      {/* ─── Tags row ──────────────────────────────────── */}
      <FilterRow
        label="Tags"
        selectionCount={selectedTags.length}
        expanded={expanded.tags}
        onToggle={() => toggleRow('tags')}
        emptyHint={visibleTags.length === 0 ? 'No tags yet' : undefined}
        summary={
          selectedTags.length > 0 ? (
            <SummaryChips
              labels={selectedTags}
              onRemove={(label) => onToggleTag(label)}
            />
          ) : null
        }
      >
        {visibleTags.map((tag) => {
          const isActive = selectedTags.includes(tag);
          return (
            <Chip
              key={tag}
              label={tag}
              active={isActive}
              onPress={() => onToggleTag(tag)}
            />
          );
        })}
      </FilterRow>

      {/* ─── Location row ──────────────────────────────── */}
      <FilterRow
        label="Location"
        selectionCount={selectedLocations.length}
        expanded={expanded.location}
        onToggle={() => toggleRow('location')}
        emptyHint={allLocations.length === 0 ? 'No locations yet' : undefined}
        summary={
          selectedLocations.length > 0 ? (
            <SummaryChips
              labels={selectedLocations}
              onRemove={(label) => onToggleLocation(label)}
              icon="location-outline"
            />
          ) : null
        }
      >
        {allLocations.map((loc) => {
          const isActive = selectedLocations.includes(loc);
          return (
            <Chip
              key={loc}
              label={loc}
              active={isActive}
              onPress={() => onToggleLocation(loc)}
              icon="location-outline"
            />
          );
        })}
      </FilterRow>

      {/* ─── Footer: Clear all ─────────────────────────── */}
      {hasActiveFilters && (
        <View style={styles.footer}>
          <Pressable
            onPress={onClearAll}
            style={({ pressed }) => [
              styles.clearBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="close" size={12} color={colors.textSoft} />
            <Text style={styles.clearLabel}>Clear all filters</Text>
          </Pressable>
        </View>
      )}

      {/* ─── Age picker modal ──────────────────────────── */}
      {scopeChild && (
        <AgeAtPicker
          visible={agePickerOpen}
          childName={scopeChild.name}
          childBirthday={scopeChild.birthday}
          initialYear={dateFilter?.kind === 'ageAt' ? dateFilter.year : null}
          onCancel={() => setAgePickerOpen(false)}
          onConfirm={handleAgeAtConfirm}
        />
      )}
    </View>
  );
}

// ─── Date Lane ───────────────────────────────────────────

interface DateLaneProps {
  dateFilter: DateFilter;
  availableYears: number[];
  scopeChild?: Child;
  onPreset: (index: number) => void;
  onYear: (year: number) => void;
  onAgeRange: (fromMonths: number, toMonths: number) => void;
  onOpenAgeAt: () => void;
  onPickChild: () => void;
}

function DateLane({
  dateFilter,
  availableYears,
  scopeChild,
  onPreset,
  onYear,
  onAgeRange,
  onOpenAgeAt,
}: DateLaneProps) {
  const ageEnabled = scopeChild != null;

  return (
    <>
      {/* Quick presets */}
      {DATE_RANGES.map((range, i) => {
        const active = dateFilter?.kind === 'preset' && dateFilter.index === i;
        return (
          <Chip
            key={range.label}
            label={range.label}
            active={active}
            onPress={() => onPreset(i)}
          />
        );
      })}

      {availableYears.length > 0 && <Divider />}

      {/* Year chips */}
      {availableYears.map((year) => {
        const active = dateFilter?.kind === 'year' && dateFilter.year === year;
        return (
          <Chip
            key={`year-${year}`}
            label={String(year)}
            active={active}
            onPress={() => onYear(year)}
          />
        );
      })}

      <Divider />

      {/* Age range presets */}
      {AGE_RANGES.map((range) => {
        const active =
          dateFilter?.kind === 'ageRange' &&
          dateFilter.fromMonths === range.fromMonths &&
          dateFilter.toMonths === range.toMonths;
        return (
          <Chip
            key={range.label}
            label={range.label}
            active={active}
            disabled={!ageEnabled}
            onPress={() => onAgeRange(range.fromMonths, range.toMonths)}
          />
        );
      })}

      {/* Age-at picker chip */}
      <Chip
        label={
          dateFilter?.kind === 'ageAt' && scopeChild
            ? `${scopeChild.name} at ${dateFilter.year}`
            : scopeChild
            ? `${scopeChild.name} at…`
            : 'At age…'
        }
        active={dateFilter?.kind === 'ageAt'}
        disabled={!ageEnabled}
        onPress={onOpenAgeAt}
        icon="time-outline"
      />

      {!ageEnabled && (
        <Text style={styles.ageHint}>Pick one child to filter by age</Text>
      )}
    </>
  );
}

// ─── Chip primitives ─────────────────────────────────────

interface ChipProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

function Chip({ label, active, disabled, onPress, icon }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        chipStyles.chip,
        active ? chipStyles.chipActive : chipStyles.chipInactive,
        disabled && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.7 },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={13}
          color={active ? colors.accent : colors.textMuted}
        />
      )}
      <Text
        style={[
          chipStyles.label,
          { color: active ? colors.accent : colors.textMuted },
          active && { fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface ActiveChipProps {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Chip used in the collapsed summary — taps clear the underlying filter. */
function ActiveChip({ label, onPress, icon }: ActiveChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        chipStyles.chip,
        chipStyles.chipActive,
        pressed && { opacity: 0.7 },
      ]}
    >
      {icon && <Ionicons name={icon} size={13} color={colors.accent} />}
      <Text style={[chipStyles.label, { color: colors.accent, fontWeight: '700' }]}>
        {label}
      </Text>
      <Ionicons name="close" size={12} color={colors.accent} />
    </Pressable>
  );
}

interface SummaryChipsProps {
  labels: string[];
  onRemove: (label: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

function SummaryChips({ labels, onRemove, icon }: SummaryChipsProps) {
  // Cap displayed chips so the summary stays compact; the chevron expands the full lane.
  const MAX = 3;
  const visible = labels.slice(0, MAX);
  const overflow = labels.length - visible.length;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.summaryRow}
    >
      {visible.map((label) => (
        <ActiveChip
          key={label}
          label={label}
          onPress={() => onRemove(label)}
          icon={icon}
        />
      ))}
      {overflow > 0 && (
        <Text style={styles.overflow}>{`+${overflow}`}</Text>
      )}
    </ScrollView>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ─── Date chip label helper ──────────────────────────────

export function formatDateChipLabel(
  filter: DateFilter,
  child?: Child,
): string | null {
  if (filter === null) return null;
  if (filter.kind === 'preset') {
    return DATE_RANGES[filter.index]?.label ?? null;
  }
  if (filter.kind === 'year') {
    return String(filter.year);
  }
  if (filter.kind === 'ageAt') {
    return child ? `${child.name} at ${filter.year}` : `Age ${filter.year}`;
  }
  if (filter.kind === 'ageRange') {
    const range = AGE_RANGES.find(
      (r) => r.fromMonths === filter.fromMonths && r.toMonths === filter.toMonths,
    );
    const childPrefix = child ? `${child.name}, ` : '';
    if (range) return `${childPrefix}${range.label}`;
    return `${childPrefix}${formatMonthRange(filter.fromMonths, filter.toMonths)}`;
  }
  return null;
}

function formatMonthRange(from: number, to: number): string {
  const fmt = (m: number) => (m < 12 ? `${m} mo` : `${Math.floor(m / 12)}y`);
  return `${fmt(from)}–${fmt(to)}`;
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.bg,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: spacing(1),
  },
  ageHint: {
    ...typography.caption,
    color: colors.textMuted,
    alignSelf: 'center',
    paddingHorizontal: spacing(2),
  },
  footer: {
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(2),
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderRadius: radii.full,
    backgroundColor: colors.tag,
    minHeight: minTouchTarget,
  },
  clearLabel: {
    ...typography.tag,
    color: colors.textSoft,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  overflow: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing(1),
  },
});

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: 1.5,
    gap: 5,
    minHeight: 32,
  },
  chipInactive: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  label: {
    ...typography.tag,
    fontWeight: '600',
  },
});
