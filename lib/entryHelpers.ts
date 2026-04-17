// Shared entry helpers — used by home, firefly-jar, and settings.
//
// Previously duplicated across screens. Centralizing means
// EntryCard format changes only need to happen once.

import type { Entry } from '@/stores/entriesStore';
import type { Child } from '@/stores/childrenStore';
import type { DraftEntry } from '@/stores/draftStore';
import { childColors, colors } from '@/constants/theme';
import { formatDate, formatTime, getAge } from '@/lib/dateUtils';

/** Build a lookup map from child array for O(1) access by ID. */
export function buildChildMap(children: Child[]): Record<string, Child> {
  const map: Record<string, Child> = {};
  children.forEach((c) => (map[c.id] = c));
  return map;
}

/** Badge info for an entry that is a child's first memory. */
export interface FirstMemoryBadge {
  names: string[];
  colorHexes: string[];
}

/**
 * Find each child's earliest entry and return badge data keyed by entry ID.
 *
 * Think of it like a "first appearance" tracker — for each child, we find
 * the oldest entry they appear in. One entry can be the "first" for multiple
 * children if they were both tagged in the same earliest memory.
 */
export function getFirstEntryBadges(
  entries: Entry[],
  childMap: Record<string, Child>,
): Map<string, FirstMemoryBadge> {
  // For each child, find their earliest entry by date
  const earliestByChild = new Map<string, { entryId: string; date: string; createdAt?: string }>();

  for (const entry of entries) {
    for (const childId of entry.childIds) {
      const existing = earliestByChild.get(childId);
      // Compare by date first, then by created_at timestamp to break ties
      // within the same day — so the truly first entry keeps the badge.
      const isEarlier =
        !existing ||
        entry.date < existing.date ||
        (entry.date === existing.date &&
          (entry.createdAt ?? '') < (existing.createdAt ?? ''));
      if (isEarlier) {
        earliestByChild.set(childId, {
          entryId: entry.id,
          date: entry.date,
          createdAt: entry.createdAt,
        });
      }
    }
  }

  // Group by entry ID — one entry could be the "first" for multiple children
  const badges = new Map<string, FirstMemoryBadge>();
  for (const [childId, { entryId }] of earliestByChild) {
    const child = childMap[childId];
    if (!child) continue;
    const hex = childColors[child.colorIndex ?? 0]?.hex ?? colors.textMuted;
    const existing = badges.get(entryId);
    if (existing) {
      existing.names.push(child.name);
      existing.colorHexes.push(hex);
    } else {
      badges.set(entryId, { names: [child.name], colorHexes: [hex] });
    }
  }

  return badges;
}

/** Map an Entry to the shape EntryCard expects. */
export function entryToCard(
  entry: Entry,
  childMap: Record<string, Child>,
  dateWeekday: 'short' | 'long' = 'short',
  firstMemoryBadges?: Map<string, FirstMemoryBadge>,
) {
  const childNames = entry.childIds.map((id) => childMap[id]?.name ?? 'Unknown');
  const entryChildColors = entry.childIds.map(
    (id) => childColors[childMap[id]?.colorIndex ?? 0]?.hex ?? colors.textMuted,
  );
  // Age at the time of the entry, not current age
  const childAges = entry.childIds
    .map((id) => {
      const child = childMap[id];
      if (!child?.birthday) return null;
      return getAge(child.birthday, entry.date);
    })
    .filter((age): age is string => age !== null);
  return {
    childNames,
    childColors: entryChildColors,
    childAges,
    date: formatDate(entry.date, dateWeekday),
    time: formatTime(entry.createdAt ?? entry.date),
    title: entry.title,
    preview: entry.text,
    tags: entry.tags,
    isFavorited: entry.isFavorited,
    hasAudio: entry.hasAudio,
    audioStoragePath: entry.audioStoragePath,
    photos: entry.photos?.map((photo) => photo.uri) ?? [],
    firstMemoryBadge: firstMemoryBadges?.get(entry.id),
  };
}

/**
 * Map a DraftEntry to the shape EntryCard expects.
 *
 * Drafts don't have children or tags assigned yet (that happens
 * during sync), so we show minimal info — just the transcript
 * preview with the date it was recorded.
 */
export function draftToCard(draft: DraftEntry) {
  return {
    childNames: [] as string[],
    childColors: [] as string[],
    date: formatDate(draft.entryDate),
    time: formatTime(draft.entryDate),
    title: undefined,
    preview: draft.transcript,
    tags: [] as string[],
    isFavorited: false,
    hasAudio: draft.audioLocalUri != null,
  };
}
