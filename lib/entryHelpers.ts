// Shared entry helpers — used by home, core-memories, and settings.
//
// Previously duplicated across screens. Centralizing means
// EntryCard format changes only need to happen once.

import type { Entry } from '@/stores/entriesStore';
import type { Child } from '@/stores/childrenStore';
import type { DraftEntry } from '@/stores/draftStore';
import { childColors, colors } from '@/constants/theme';
import { formatDate, formatTime } from '@/lib/dateUtils';

/** Build a lookup map from child array for O(1) access by ID. */
export function buildChildMap(children: Child[]): Record<string, Child> {
  const map: Record<string, Child> = {};
  children.forEach((c) => (map[c.id] = c));
  return map;
}

/** Map an Entry to the shape EntryCard expects. */
export function entryToCard(
  entry: Entry,
  childMap: Record<string, Child>,
  dateWeekday: 'short' | 'long' = 'short',
) {
  const childNames = entry.childIds.map((id) => childMap[id]?.name ?? 'Unknown');
  const entryChildColors = entry.childIds.map(
    (id) => childColors[childMap[id]?.colorIndex ?? 0]?.hex ?? colors.textMuted,
  );
  return {
    childNames,
    childColors: entryChildColors,
    date: formatDate(entry.date, dateWeekday),
    time: formatTime(entry.createdAt ?? entry.date),
    title: entry.title,
    preview: entry.text,
    tags: entry.tags,
    isFavorited: entry.isFavorited,
    hasAudio: entry.hasAudio,
    audioStoragePath: entry.audioStoragePath,
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
