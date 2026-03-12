// Shared date/time formatting utilities.
//
// These were previously duplicated across 4+ screens.
// Centralizing them means any locale or format changes
// only need to happen in one place.

/**
 * Format a date for display in cards and lists.
 * "Mon, Jan 5" (short) or "Monday, Jan 5" (long).
 */
export function formatDate(
  iso: string,
  weekday: 'short' | 'long' = 'short',
): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday, month: 'short', day: 'numeric' });
}

/**
 * Format a time for display: "3:42 PM".
 */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Format a duration in seconds to "m:ss".
 * Accepts either seconds or milliseconds (pass ms=true).
 */
export function formatDuration(value: number, ms = false): string {
  const totalSeconds = ms ? Math.floor(value / 1000) : Math.floor(value);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Calculate a child's age relative to a reference date.
 * Returns a compact string like "2y 3m", "8m", or "1y".
 */
export function getAge(birthday: string, referenceDate?: string): string {
  const [by, bm, bd] = birthday.split('-').map(Number);
  const b = new Date(by, bm - 1, bd);
  const d = referenceDate
    ? (() => { const [ry, rm, rd] = referenceDate.split('-').map(Number); return new Date(ry, rm - 1, rd); })()
    : new Date();
  let years = d.getFullYear() - b.getFullYear();
  let months = d.getMonth() - b.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 1) return `${months}mo`;
  if (months === 0) return `${years}y`;
  return `${years}y ${months}m`;
}

/**
 * Convert a 12-hour display string like "8:30 PM" to 24-hour format "20:30".
 * The database stores times in 24-hour format, but the UI shows 12-hour.
 */
export function to24Hour(display: string): string {
  const [timePart, period] = display.split(' ');
  const [hourStr, minute] = timePart.split(':');
  let hour = parseInt(hourStr, 10);

  if (period === 'AM' && hour === 12) hour = 0;
  else if (period === 'PM' && hour !== 12) hour += 12;

  return `${String(hour).padStart(2, '0')}:${minute}`;
}

/**
 * Convert a 24-hour string like "20:30" back to 12-hour display "8:30 PM".
 */
export function from24Hour(time24: string): string {
  const [hourStr, minute] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? 'PM' : 'AM';

  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;

  return `${hour}:${minute} ${period}`;
}

/**
 * Return how many days ago a given ISO date string was.
 * Returns 0 if the date is today or in the future.
 */
export function daysAgo(iso: string): number {
  const then = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

/**
 * Calculate a child's age in months (for prompt filtering).
 */
export function ageInMonths(birthday: string): number {
  const [by, bm] = birthday.split('-').map(Number);
  const b = new Date(by, bm - 1, 1);
  const now = new Date();
  return (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
}
