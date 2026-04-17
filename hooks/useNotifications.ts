// useNotifications — client-side notification coordinator.
//
// Called once in the root layout. Think of it as a receptionist who:
// 1. On arrival (app open): registers this device so the server knows
//    where to send push notifications
// 2. While waiting: listens for notification taps and routes the user
//    to the right screen
// 3. On departure (cleanup): removes the listeners
// 4. Detects when the user previously opted in to notifications but
//    the phone's permission was lost (e.g. after reinstall) and
//    returns a flag so the UI can prompt them to re-enable.
//
// The actual SENDING of notifications happens server-side (Edge Function).
// This hook only handles the client half: registration + tap routing.

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationResponse } from 'expo-notifications';

import { useAuthStore } from '@/stores/authStore';
import { notificationsService } from '@/services/notifications.service';
import { profilesService } from '@/services/profiles.service';
import {
  getPermissionStatus,
  requestPermissions,
  getExpoPushToken,
  setupAndroidChannel,
  setupNotificationCategory,
  addResponseListener,
  getLastNotificationResponse,
  scheduleSnooze,
} from '@/lib/notifications';
import { capture } from '@/lib/posthog';

// AsyncStorage keys
const PUSH_TOKEN_KEY = 'ff_push_token';
const PENDING_NAV_KEY = 'ff_pending_nav';

/**
 * Handles notification device registration and tap routing.
 *
 * Must be called in the root layout AFTER auth is initialized.
 * Silently does nothing if the user isn't authenticated or hasn't
 * granted notification permissions.
 *
 * Returns:
 * - `needsPermissionPrompt`: true when the user previously opted in
 *   to notifications but this device doesn't have phone-level permission.
 *   The UI should show a modal and call `resolvePermissionMismatch()`.
 * - `resolvePermissionMismatch(enable)`: call with `true` to request
 *   permission and register, or `false` to turn off notifications in DB.
 */
export function useNotifications() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);

  const routerRef = useRef(router);
  routerRef.current = router;

  const isWeb = Platform.OS === 'web';

  const sessionRef = useRef(session);
  sessionRef.current = session;

  // ─── Permission mismatch detection ─────────────────────────
  // When true, the UI should show a modal asking the user to
  // re-enable notifications on this device.
  const [needsPermissionPrompt, setNeedsPermissionPrompt] = useState(false);

  // ─── Device registration (runs once when user is authenticated) ──

  useEffect(() => {
    if (isWeb) return;
    if (!session?.user?.id || !profile) return;

    let cancelled = false;

    async function registerDevice() {
      try {
        // Sync the device's timezone and recompute notification_time_utc.
        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (deviceTimezone && profile?.notification_time) {
          const localTime = (profile.notification_time as string).substring(0, 5);
          profilesService.syncTimezone(deviceTimezone, localTime).catch(
            (err) => console.warn('Failed to sync timezone:', err)
          );
        }

        // Set up Android notification channel + action button category
        await Promise.all([
          setupAndroidChannel(),
          setupNotificationCategory(),
        ]);

        // Check if we already have permission (don't prompt here —
        // that happens during onboarding or when toggling in settings)
        const { granted } = await getPermissionStatus();

        if (!granted) {
          // If the user previously opted in but this device doesn't
          // have permission, flag it so the UI can show a prompt.
          if (!cancelled && profile?.notification_enabled) {
            const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
            if (!storedToken) {
              setNeedsPermissionPrompt(true);
            }
          }
          return;
        }

        if (cancelled) return;

        // Get the device's push token
        const token = await getExpoPushToken();
        if (!token || cancelled) return;

        // Save token locally so we can deactivate it on logout
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

        // Register with Supabase so the Edge Function knows to send here
        const platform = Platform.OS as 'ios' | 'android';
        await notificationsService.registerDevice(token, platform);
        await notificationsService.updateDeviceActivity(token);
      } catch (error) {
        console.warn('Notification registration failed:', error);
      }
    }

    registerDevice();
    return () => { cancelled = true; };
  }, [session?.user?.id, profile?.id]);

  // ─── Resolve the permission mismatch ───────────────────────
  // Called by the UI modal when the user taps "Turn on" or "Skip".

  async function resolvePermissionMismatch(enable: boolean) {
    setNeedsPermissionPrompt(false);

    if (!enable) {
      // User said "Skip" — turn off notifications in the database
      // so we don't keep asking on future app opens.
      try {
        await profilesService.updateNotificationPrefs({
          notification_enabled: false,
        });
        // Update the local profile state so the Settings toggle reflects this
        const currentProfile = useAuthStore.getState().profile;
        if (currentProfile) {
          useAuthStore.getState().setProfile({
            ...currentProfile,
            notification_enabled: false,
          });
        }
      } catch (err) {
        console.warn('Failed to disable notifications:', err);
      }
      return { granted: false, openSettings: false };
    }

    // User said "Turn on" — request permission from Android
    const { granted } = await requestPermissions();

    if (!granted) {
      // Android blocked the prompt (denied too many times).
      // Return a flag so the UI can offer "Open Settings" instead.
      return { granted: false, openSettings: true };
    }

    // Permission granted — register the push token
    try {
      const token = await getExpoPushToken();
      if (token) {
        const platform = Platform.OS as 'ios' | 'android';
        await notificationsService.registerDevice(token, platform);
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
        await notificationsService.updateDeviceActivity(token);
        capture('notification_permission_restored');
      }
    } catch (err) {
      console.warn('Failed to register after permission grant:', err);
    }

    return { granted: true, openSettings: false };
  }

  // ─── Tap listener (runs for the lifetime of the component) ───────

  useEffect(() => {
    function handleNotificationResponse(response: NotificationResponse) {
      const actionId = response.actionIdentifier;
      const data = response.notification.request.content.data as {
        notificationLogId?: string;
      } | undefined;

      const logId = data?.notificationLogId;

      // Mark the notification as tapped in the database (fire-and-forget)
      if (logId) {
        notificationsService.markTapped(logId).catch((err) =>
          console.warn('Failed to mark notification tapped:', err)
        );
      }

      capture('notification_tapped', {
        action: actionId === 'snooze' ? 'snooze' : actionId === 'record' ? 'record' : 'body_tap',
      });

      if (actionId === 'snooze') {
        const { title, body } = response.notification.request.content;
        scheduleSnooze(title ?? 'Forever Fireflies', body ?? 'Time to capture a memory!').catch(
          (err) => console.warn('Failed to schedule snooze:', err)
        );
        return;
      }

      const target = actionId === 'record'
        ? `/(main)/recording?fromNotification=${logId ?? 'true'}`
        : '/(main)/(tabs)/home';

      try {
        routerRef.current.push(target as any);
      } catch {
        AsyncStorage.setItem(PENDING_NAV_KEY, target).catch(() => {});
      }
    }

    const subscription = addResponseListener(handleNotificationResponse);

    getLastNotificationResponse().then((response) => {
      if (response) handleNotificationResponse(response);
    });

    return () => subscription.remove();
  }, []);

  // ─── Cold start pending navigation ──────────────────────────────

  useEffect(() => {
    if (!session?.user?.id || !profile) return;

    AsyncStorage.getItem(PENDING_NAV_KEY).then((target) => {
      if (target) {
        AsyncStorage.removeItem(PENDING_NAV_KEY);
        setTimeout(() => {
          routerRef.current.push(target as any);
        }, 100);
      }
    });
  }, [session?.user?.id, profile?.id]);

  return { needsPermissionPrompt, resolvePermissionMismatch };
}

// ─── Helpers for other screens ────────────────────────────────────

/** Read the stored push token (for deactivation on logout). */
export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

/** Clear the stored push token (after deactivation). */
export async function clearStoredPushToken(): Promise<void> {
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}
