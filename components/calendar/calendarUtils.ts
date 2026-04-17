import type { Entry } from '@/stores/entriesStore';

/** A single cell in the 6x7 month grid */
export interface GridCell {
  /** YYYY-MM-DD date string */
  date: string;
  /** Day of the month (1-31) */
  day: number;
  /** Whether this cell belongs to the currently displayed month */
  isCurrentMonth: boolean;
}

/**
 * Build a 6-row x 7-column grid for the given month.
 *
 * Think of it like a physical wall calendar — the grid always
 * has 6 rows so the layout height never jumps when you change
 * months. Days from the previous/next month fill the gaps.
 *
 * Week starts on Sunday (column 0).
 */
export function getMonthGrid(year: number, month: number): GridCell[][] {
  // month is 0-indexed (0 = January)
  const firstOfMonth = new Date(year, month, 1);
  const startDow = firstOfMonth.getDay(); // 0 = Sunday

  // Walk backward to fill the first row's leading days
  const gridStart = new Date(year, month, 1 - startDow);

  const rows: GridCell[][] = [];

  for (let row = 0; row < 6; row++) {
    const week: GridCell[] = [];
    for (let col = 0; col < 7; col++) {
      const d = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + row * 7 + col,
      );
      week.push({
        date: toDateStr(d),
        day: d.getDate(),
        isCurrentMonth: d.getMonth() === month && d.getFullYear() === year,
      });
    }
    rows.push(week);
  }

  return rows;
}

/**
 * Group entries by their date string (YYYY-MM-DD).
 *
 * Filters out deleted entries. Returns a Map so day-cell
 * lookups are O(1) instead of scanning the whole array.
 */
export function groupEntriesByDate(entries: Entry[]): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>();

  for (const entry of entries) {
    if (entry.isDeleted) continue;
    const existing = map.get(entry.date);
    if (existing) {
      existing.push(entry);
    } else {
      map.set(entry.date, [entry]);
    }
  }

  return map;
}

/**
 * Find the year/month of the earliest non-deleted entry.
 *
 * Used to prevent backward navigation past where entries exist.
 * Returns null if there are no entries at all.
 */
export function getEarliestEntryMonth(
  entries: Entry[],
): { year: number; month: number } | null {
  let earliest: string | null = null;

  for (const entry of entries) {
    if (entry.isDeleted) continue;
    if (!earliest || entry.date < earliest) {
      earliest = entry.date;
    }
  }

  if (!earliest) return null;

  const [year, month] = earliest.split('-').map(Number);
  // month in the date string is 1-indexed, convert to 0-indexed
  return { year, month: month - 1 };
}

/** Format a Date as YYYY-MM-DD in local time */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get today's date as YYYY-MM-DD in local time */
export function getTodayStr(): string {
  return toDateStr(new Date());
}
