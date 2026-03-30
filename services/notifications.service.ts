// Notifications service — manage push notification device tokens.
// When the app opens, it registers the device's push token so Supabase
// knows where to send the nightly recording reminder.

import { supabase } from '@/lib/supabase';

export const notificationsService = {
  /** Register or update a device's push token.
   *  Uses an RPC (database function) instead of a direct upsert because
   *  push tokens belong to physical devices, not users. If user A logs out
   *  and user B logs in on the same phone, the token is the same — but RLS
   *  would block user B from updating user A's row. The RPC runs as the
   *  DB owner so it can safely reassign the token to the current user. */
  async registerDevice(pushToken: string, platform: 'ios' | 'android', deviceName?: string) {
    const { data, error } = await supabase.rpc('register_device', {
      p_push_token: pushToken,
      p_platform: platform,
      p_device_name: deviceName,
    });

    if (error) throw new Error(`Failed to register device: ${error.message}`, { cause: error });
    return data;
  },

  /** Update last active timestamp (called on each app open) */
  async updateDeviceActivity(pushToken: string) {
    const { error } = await supabase
      .from('user_devices')
      .update({ last_active_at: new Date().toISOString() })
      .eq('push_token', pushToken);

    if (error) throw new Error(`Failed to update device activity: ${error.message}`, { cause: error });
  },

  /** Deactivate a device on logout (don't delete — they might log back in) */
  async deactivateDevice(pushToken: string) {
    const { error } = await supabase
      .from('user_devices')
      .update({ is_active: false })
      .eq('push_token', pushToken);

    if (error) throw new Error(`Failed to deactivate device: ${error.message}`, { cause: error });
  },

  // ─── Notification Log ───────────────────────────────────

  /** Mark a notification as tapped by the user.
   *  Called from the tap listener when the user interacts with
   *  a notification. The `logId` comes from the notification's
   *  data payload (set by the Edge Function when it sent the push). */
  async markTapped(logId: string) {
    const { error } = await supabase
      .from('notification_log')
      .update({ tapped: true, tapped_at: new Date().toISOString() })
      .eq('id', logId);

    if (error) throw new Error(`Failed to mark notification tapped: ${error.message}`, { cause: error });
  },

  /** Mark that a notification tap led to a saved entry.
   *  Called from the recording screen when the user finishes
   *  recording after opening the app via a notification. */
  async markResultedInEntry(logId: string) {
    const { error } = await supabase
      .from('notification_log')
      .update({ resulted_in_entry: true })
      .eq('id', logId);

    if (error) throw new Error(`Failed to mark notification result: ${error.message}`, { cause: error });
  },

  /** Get the most recent notification log ID for a user.
   *  Fallback for when the notification's data payload is missing
   *  (e.g. on older versions or edge cases). */
  async getLatestLogId(profileId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('notification_log')
      .select('id')
      .eq('profile_id', profileId)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Failed to get latest notification log: ${error.message}`, { cause: error });
    return data?.id ?? null;
  },
};
