// Notifications service — manage push notification device tokens.
// When the app opens, it registers the device's push token so Supabase
// knows where to send the nightly recording reminder.

import { supabase } from '@/lib/supabase';

export const notificationsService = {
  /** Register or update a device's push token */
  async registerDevice(profileId: string, pushToken: string, platform: 'ios' | 'android', deviceName?: string) {
    const { data, error } = await supabase
      .from('user_devices')
      .upsert(
        {
          profile_id: profileId,
          push_token: pushToken,
          platform,
          device_name: deviceName,
          is_active: true,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: 'push_token' }
      )
      .select()
      .single();

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
