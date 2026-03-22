// Profiles service — read and update the current user's profile.
// The profile is auto-created by a database trigger when someone signs up,
// so there's no "create" method here.

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export const profilesService = {
  /** Get the current user's profile.
   *  Checks auth first so an expired session gives a clear error
   *  instead of a confusing "0 rows returned" from .single(). */
  async getProfile(): Promise<Profile> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated — cannot fetch profile');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) throw new Error(`Failed to fetch profile: ${error.message}`, { cause: error });
    return data;
  },

  /** Update profile fields (display name, notification prefs, etc.).
   *  Gets the user ID safely from the session instead of using a
   *  non-null assertion (!) that would crash with a confusing error. */
  async updateProfile(updates: ProfileUpdate) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated — cannot update profile');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update profile: ${error.message}`, { cause: error });
    return data;
  },

  /** Mark onboarding as completed */
  async completeOnboarding() {
    return this.updateProfile({ onboarding_completed: true });
  },

  /** Start the 7-day free trial. Called once when the user saves their first entry.
   *  Uses an RPC (database function) because the guard trigger blocks direct
   *  client-side writes to trial_started_at. The RPC is idempotent — calling
   *  it twice has no effect because it only sets the value if it's currently NULL.
   *
   *  Think of it like a "stamp your hand" booth at a theme park — you only get
   *  stamped the first time you walk through. If you come back, the attendant
   *  sees the stamp and waves you along. */
  async startTrial() {
    const { error } = await supabase.rpc('start_trial');
    if (error) throw new Error('Failed to start trial: ' + error.message, { cause: error });
  },

  /** Update notification preferences */
  async updateNotificationPrefs(prefs: {
    notification_enabled?: boolean;
    notification_time?: string;
    notification_days?: number[];
  }) {
    return this.updateProfile(prefs);
  },

  /** Sync the device's timezone and recompute notification_time_utc.
   *
   *  Called on every app open. The client detects the IANA timezone
   *  (e.g. "America/New_York"), then converts notification_time
   *  from local → UTC so the Edge Function can do a simple
   *  `WHERE notification_time_utc = current_utc_slot` query.
   *
   *  This also handles daylight saving time automatically — each
   *  app open recomputes the UTC equivalent, so when clocks change,
   *  the notification still fires at the right local time. */
  async syncTimezone(timezone: string, notificationTimeLocal?: string) {
    const updates: Record<string, unknown> = { timezone };

    // If we have the local notification time, convert it to UTC.
    // notification_time is stored as "HH:MM" in 24-hour format.
    if (notificationTimeLocal) {
      updates.notification_time_utc = localTimeToUtc(notificationTimeLocal, timezone);
    }

    return this.updateProfile(updates as ProfileUpdate);
  },
};

// ─── Helper ───────────────────────────────────────────────

/** Convert a local time string (e.g. "20:30") to UTC, given an
 *  IANA timezone (e.g. "America/New_York").
 *
 *  How it works: We create a Date object for "today at 20:30 in
 *  America/New_York", then read back the UTC hours and minutes.
 *  Intl.DateTimeFormat does the heavy lifting of knowing that
 *  New York is UTC-5 in winter and UTC-4 in summer.
 *
 *  Returns a "HH:MM" string in UTC. */
function localTimeToUtc(localTime: string, timezone: string): string {
  const [hours, minutes] = localTime.split(':').map(Number);

  // Build a date for today with the given local time.
  // We use a recent fixed date to avoid edge cases.
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  // Create a formatter that tells us the UTC offset for this timezone today.
  // We do this by formatting the same instant in both UTC and the target
  // timezone, then computing the difference.
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const localFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  // Use noon today as a reference point (avoids midnight edge cases)
  const ref = new Date(Date.UTC(year, month, day, 12, 0, 0));
  const utcParts = utcFormatter.formatToParts(ref);
  const localParts = localFormatter.formatToParts(ref);

  const utcH = parseInt(utcParts.find((p) => p.type === 'hour')?.value ?? '12', 10);
  const utcM = parseInt(utcParts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const locH = parseInt(localParts.find((p) => p.type === 'hour')?.value ?? '12', 10);
  const locM = parseInt(localParts.find((p) => p.type === 'minute')?.value ?? '0', 10);

  // Offset in minutes: how far ahead local is from UTC
  // e.g. America/New_York in winter: local=7:00, utc=12:00 → offset = -300 (UTC-5)
  const offsetMinutes = (locH * 60 + locM) - (utcH * 60 + utcM);

  // Convert the desired local time to UTC by subtracting the offset
  const localMinutesTotal = hours * 60 + minutes;
  let utcMinutesTotal = localMinutesTotal - offsetMinutes;

  // Wrap around midnight (e.g. 23:00 EST → 04:00 UTC next day)
  if (utcMinutesTotal < 0) utcMinutesTotal += 1440;
  if (utcMinutesTotal >= 1440) utcMinutesTotal -= 1440;

  const utcHours = Math.floor(utcMinutesTotal / 60);
  const utcMins = utcMinutesTotal % 60;

  return `${String(utcHours).padStart(2, '0')}:${String(utcMins).padStart(2, '0')}`;
}
