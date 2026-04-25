import { useState, useMemo, useCallback } from 'react';
import type { Entry } from '@/stores/entriesStore';
import type { Child } from '@/stores/childrenStore';
import { ageInMonthsAt } from '@/lib/dateUtils';

// ─── Date Range Presets ──────────────────────────────────

export const DATE_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 3 months', days: 90 },
  { label: 'All time', days: null },
] as const;

// ─── Age Range Presets ───────────────────────────────────
// Inclusive month bounds. `Big kid` is open-ended (3y+).

export const AGE_RANGES = [
  { label: 'Newborn', fromMonths: 0, toMonths: 3 },
  { label: 'Baby', fromMonths: 0, toMonths: 12 },
  { label: 'Toddler', fromMonths: 12, toMonths: 36 },
  { label: 'Big kid', fromMonths: 36, toMonths: Number.MAX_SAFE_INTEGER },
] as const;

// ─── Date Filter Type ────────────────────────────────────

export type DateFilter =
  | { kind: 'preset'; index: number }
  | { kind: 'year'; year: number }
  | { kind: 'ageAt'; year: number }
  | { kind: 'ageRange'; fromMonths: number; toMonths: number }
  | null;

// ─── Helpers ─────────────────────────────────────────────

/** Parse a date-only ISO string ("YYYY-MM-DD") as local midnight to avoid UTC drift. */
function parseEntryDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Collect all unique tags from non-deleted entries, sorted alphabetically */
export function collectTags(entries: Entry[]): string[] {
  const tagSet = new Set<string>();
  entries.forEach((e) => {
    if (!e.isDeleted) {
      e.tags.forEach((t) => tagSet.add(t));
    }
  });
  return Array.from(tagSet).sort();
}

/** Collect unique non-empty locationText values from non-deleted entries, sorted */
export function collectLocations(entries: Entry[]): string[] {
  const locSet = new Set<string>();
  entries.forEach((e) => {
    if (!e.isDeleted && e.locationText) {
      locSet.add(e.locationText);
    }
  });
  return Array.from(locSet).sort();
}

/** Return tags that exist on at least one filtered entry, excluding already-selected tags */
export function getAvailableTags(filteredEntries: Entry[], selectedTags: string[]): string[] {
  const tagSet = new Set<string>();
  filteredEntries.forEach((e) => {
    e.tags.forEach((t) => {
      if (!selectedTags.includes(t)) tagSet.add(t);
    });
  });
  return Array.from(tagSet).sort();
}

/** Years (descending) that have at least one entry, used for the year chip lane */
export function collectYears(entries: Entry[]): number[] {
  const years = new Set<number>();
  entries.forEach((e) => {
    if (!e.isDeleted && e.date) {
      years.add(parseEntryDate(e.date).getFullYear());
    }
  });
  return Array.from(years).sort((a, b) => b - a);
}

// ─── Hook ────────────────────────────────────────────────

export function useSearchFilter() {
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>(null);

  const hasActiveFilters = useMemo(
    () =>
      query.trim().length > 0 ||
      selectedTags.length > 0 ||
      selectedLocations.length > 0 ||
      dateFilter !== null,
    [query, selectedTags, selectedLocations, dateFilter],
  );

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const toggleLocation = useCallback((location: string) => {
    setSelectedLocations((prev) =>
      prev.includes(location) ? prev.filter((l) => l !== location) : [...prev, location],
    );
  }, []);

  /** Toggle a date filter — applying the same filter again clears it. */
  const toggleDateFilter = useCallback((next: DateFilter) => {
    setDateFilter((prev) => {
      if (next === null) return null;
      if (prev && prev.kind === next.kind) {
        if (next.kind === 'preset' && prev.kind === 'preset' && prev.index === next.index) return null;
        if (next.kind === 'year' && prev.kind === 'year' && prev.year === next.year) return null;
        if (next.kind === 'ageAt' && prev.kind === 'ageAt' && prev.year === next.year) return null;
        if (
          next.kind === 'ageRange' &&
          prev.kind === 'ageRange' &&
          prev.fromMonths === next.fromMonths &&
          prev.toMonths === next.toMonths
        ) {
          return null;
        }
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setQuery('');
    setSelectedTags([]);
    setSelectedLocations([]);
    setDateFilter(null);
  }, []);

  /**
   * Apply tag, location, date, and text filters to an entry array.
   * `child` is required for ageAt/ageRange filters; pass it in when one child
   * is in scope (single-child family, or active child tab).
   */
  const filterEntries = useCallback(
    (entries: Entry[], child?: Child): Entry[] => {
      let filtered = entries;

      // Filter by selected tags (AND logic — entry must have ALL selected tags)
      if (selectedTags.length > 0) {
        filtered = filtered.filter((e) =>
          selectedTags.every((t) => e.tags.includes(t)),
        );
      }

      // Filter by selected locations (OR logic)
      if (selectedLocations.length > 0) {
        filtered = filtered.filter((e) =>
          e.locationText != null && selectedLocations.includes(e.locationText),
        );
      }

      // Filter by date
      if (dateFilter !== null) {
        filtered = filtered.filter((e) => {
          if (!e.date) return false;
          if (dateFilter.kind === 'preset') {
            const range = DATE_RANGES[dateFilter.index];
            if (!range || range.days === null) return true;
            const cutoff = new Date();
            cutoff.setHours(0, 0, 0, 0);
            cutoff.setDate(cutoff.getDate() - range.days);
            return parseEntryDate(e.date) >= cutoff;
          }
          if (dateFilter.kind === 'year') {
            return parseEntryDate(e.date).getFullYear() === dateFilter.year;
          }
          if (dateFilter.kind === 'ageAt') {
            if (!child) return false;
            const months = ageInMonthsAt(child.birthday, e.date);
            return Math.floor(months / 12) === dateFilter.year;
          }
          if (dateFilter.kind === 'ageRange') {
            if (!child) return false;
            const months = ageInMonthsAt(child.birthday, e.date);
            return months >= dateFilter.fromMonths && months <= dateFilter.toMonths;
          }
          return true;
        });
      }

      // Filter by text query (case-insensitive substring, searches title + transcript + location)
      const trimmed = query.trim().toLowerCase();
      if (trimmed) {
        filtered = filtered.filter((e) =>
          e.text.toLowerCase().includes(trimmed) ||
          (e.title?.toLowerCase().includes(trimmed) ?? false) ||
          (e.locationText?.toLowerCase().includes(trimmed) ?? false),
        );
      }

      return filtered;
    },
    [selectedTags, selectedLocations, dateFilter, query],
  );

  return {
    query,
    setQuery,
    selectedTags,
    toggleTag,
    selectedLocations,
    toggleLocation,
    dateFilter,
    setDateFilter: toggleDateFilter,
    hasActiveFilters,
    clearAll,
    filterEntries,
  };
}
