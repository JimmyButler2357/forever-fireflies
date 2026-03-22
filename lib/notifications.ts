// Notifications utility — wraps expo-notifications so no other file
// imports it directly. Think of it as a toolbox: the rest of the app
// reaches in for permissions, tokens, snooze scheduling, and listeners
// without needing to know the low-level Expo API.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ─── Platform guard ───────────────────────────────────────
// expo-notifications is native-only — every function below returns a
// safe no-op value on web so callers don't need their own guards.
const isWeb = Platform.OS === 'web';

// Dummy subscription returned on web so callers can still call .remove()
const NOOP_SUBSCRIPTION = { remove: () => {} };

// ─── Constants ────────────────────────────────────────────

const EAS_PROJECT_ID = '28237d21-d29f-4e56-a83d-002d9d20739f';

// Category identifier used by the Edge Function when sending push
// notifications. The category tells the OS which action buttons to show.
const CATEGORY_ID = 'daily-reminder';

// ─── Permissions ──────────────────────────────────────────

/** Ask the OS for permission to show notifications.
 *  Returns `{ granted: true }` if the user said yes (or already said yes
 *  previously). On iOS this shows the system dialog; on Android 13+ it
 *  shows a runtime permission prompt. */
export async function requestPermissions(): Promise<{ granted: boolean }> {
  if (isWeb) return { granted: false };
  const { status } = await Notifications.requestPermissionsAsync();
  return { granted: status === 'granted' };
}

/** Check current permission status WITHOUT prompting the user.
 *  Useful on app launch to silently skip registration if they said no. */
export async function getPermissionStatus(): Promise<{ granted: boolean }> {
  if (isWeb) return { granted: false };
  const { status } = await Notifications.getPermissionsAsync();
  return { granted: status === 'granted' };
}

// ─── Push Token ───────────────────────────────────────────

/** Get the Expo push token for this device.
 *  This is the address the server uses to send notifications here.
 *  Returns `null` on iOS simulator (which can't get tokens) or if
 *  anything goes wrong — callers should handle null gracefully. */
export async function getExpoPushToken(): Promise<string | null> {
  if (isWeb) return null;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });
    return data; // e.g. "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
  } catch (error) {
    // iOS simulator and some emulators can't generate push tokens.
    // This is expected — just skip token registration silently.
    console.warn('Could not get push token (expected on simulator):', error);
    return null;
  }
}

// ─── Snooze (Local) ───────────────────────────────────────

/** Schedule a one-time local notification 30 minutes from now.
 *  Used when the user taps "Remind me later" on the daily reminder.
 *  Think of it like hitting the snooze button on an alarm clock. */
export async function scheduleSnooze(title: string, body: string): Promise<void> {
  if (isWeb) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      categoryIdentifier: CATEGORY_ID,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 30 * 60, // 30 minutes
    },
  });
}

// ─── Categories & Channels ────────────────────────────────

/** Create the "daily-reminder" notification category with action buttons.
 *  Think of a category like a template — it tells the OS "when you show
 *  a notification with this category ID, also show these buttons." */
export async function setupNotificationCategory(): Promise<void> {
  if (isWeb) return;
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    {
      identifier: 'record',
      buttonTitle: 'Record',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'snooze',
      buttonTitle: 'Remind me later',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

/** Android-only: create a notification channel with our accent color.
 *  Android requires channels (think of them like folders for notifications)
 *  since Android 8+. iOS ignores this call. */
export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('daily-reminder', {
    name: 'Daily Reminder',
    description: 'Your nightly nudge to record a memory',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#E8724A',
    vibrationPattern: [0, 250, 250, 250],
  });
}

// ─── Listeners ────────────────────────────────────────────

/** Listen for when the user taps a notification (or an action button).
 *  Returns a subscription you should clean up in useEffect's return. */
export function addResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
): Notifications.Subscription {
  if (isWeb) return NOOP_SUBSCRIPTION as Notifications.Subscription;
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/** Listen for notifications that arrive while the app is in the foreground.
 *  Returns a subscription you should clean up in useEffect's return. */
export function addReceivedListener(
  callback: (notification: Notifications.Notification) => void,
): Notifications.Subscription {
  if (isWeb) return NOOP_SUBSCRIPTION as Notifications.Subscription;
  return Notifications.addNotificationReceivedListener(callback);
}

/** Get the notification response that launched the app (cold start).
 *  Returns null if the app wasn't opened via a notification tap. */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  if (isWeb) return null;
  return Notifications.getLastNotificationResponseAsync();
}
