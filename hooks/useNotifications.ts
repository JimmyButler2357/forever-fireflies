// useNotifications — client-side notification coordinator.
//
// Called once in the root layout. Think of it as a receptionist who:
// 1. On arrival (app open): registers this device so the server knows
//    where to send push notifications
// 2. While waiting: listens for notification taps and routes the user
//    to the right screen
// 3. On departure (cleanup): removes the listeners
//
// The actual SENDING of notifications happens server-side (Edge Function).
// This hook only handles the client half: registration + tap routing.

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotificationResponse } from 'expo-notifications';

import { useAuthStore } from '@/stores/authStore';
import { notificationsService } from '@/services/notifications.service';
import { profilesService } from '@/services/profiles.service';
import {
  getPermissionStatus,
  getExpoPushToken,
  setupAndroidChannel,
  setupNotificationCategory,
  addResponseListener,
  getLastNotificationResponse,
  scheduleSnooze,
} from '@/lib/notifications';

// AsyncStorage keys
const PUSH_TOKEN_KEY = 'ff_push_token';
const PENDING_NAV_KEY = 'ff_pending_nav';

/**
 * Handles notification device registration and tap routing.
 *
 * Must be called in the root layout AFTER auth is initialized.
 * Silently does nothing if the user isn't authenticated or hasn't
 * granted notification permissions.
 */
export function useNotifications() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);

  // Store router in a ref so the tap listener always has the latest
  // version. Without this, the listener captures the router from the
  // first render and can't navigate properly later (stale closure).
  const routerRef = useRef(router);
  routerRef.current = router;

  // Notifications aren't available on web — expo-notifications is a
  // native-only module. Skip all registration and listeners on web.
  const isWeb = Platform.OS === 'web';

  const sessionRef = useRef(session);
  sessionRef.current = session;

  // ─── Device registration (runs once when user is authenticated) ──

  useEffect(() => {
    if (isWeb) return;
    if (!session?.user?.id || !profile) return;

    let cancelled = false;

    async function registerDevice() {
      try {
        // Sync the device's timezone and recompute notification_time_utc.
        // This converts "8:30 PM America/New_York" → "01:30 UTC" so the
        // Edge Function can do a simple UTC comparison instead of loading
        // every profile and doing timezone math. Also handles DST — each
        // app open recomputes, so when clocks change the UTC time adjusts.
        const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (deviceTimezone && profile?.notification_time) {
          // notification_time is stored as "HH:MM:SS", we just need "HH:MM"
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
        if (!granted || cancelled) return;

        // Get the device's push token (the "address" for push notifications)
        const token = await getExpoPushToken();
        if (!token || cancelled) return;

        // Save token locally so we can deactivate it on logout
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

        // Register with Supabase so the Edge Function knows to send here
        const platform = Platform.OS as 'ios' | 'android';
        await notificationsService.registerDevice(
          session!.user.id,
          token,
          platform,
        );
        // Update last-active timestamp (helps the server know which
        // devices are still in use vs abandoned)
        await notificationsService.updateDeviceActivity(token);
      } catch (error) {
        // Non-blocking — notifications are a nice-to-have, not critical.
        // The app works fine without them.
        console.warn('Notification registration failed:', error);
      }
    }

    registerDevice();
    return () => { cancelled = true; };
  }, [session?.user?.id, profile?.id]);

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

      if (actionId === 'snooze') {
        // "Remind me later" — schedule a local notification 30 min from now
        const { title, body } = response.notification.request.content;
        scheduleSnooze(title ?? 'Forever Fireflies', body ?? 'Time to capture a memory!').catch(
          (err) => console.warn('Failed to schedule snooze:', err)
        );
        return;
      }

      // For "record" action or body tap — navigate to the right screen.
      // If the router isn't ready (cold start), store the target in
      // AsyncStorage and let _layout.tsx pick it up after init.
      const target = actionId === 'record'
        ? `/(main)/recording?fromNotification=${logId ?? 'true'}`
        : '/(main)/home';

      try {
        routerRef.current.push(target as any);
      } catch {
        // Router not ready (cold start) — store for later
        AsyncStorage.setItem(PENDING_NAV_KEY, target).catch(() => {});
      }
    }

    const subscription = addResponseListener(handleNotificationResponse);

    // Cold start: check if the app was opened via a notification tap
    // before the listener was registered
    getLastNotificationResponse().then((response) => {
      if (response) handleNotificationResponse(response);
    });

    return () => subscription.remove();
  }, []);

  // ─── Cold start pending navigation ──────────────────────────────
  // If the app was killed and a notification tap stored a pending
  // navigation target, pick it up now and navigate.

  useEffect(() => {
    if (!session?.user?.id || !profile) return;

    AsyncStorage.getItem(PENDING_NAV_KEY).then((target) => {
      if (target) {
        AsyncStorage.removeItem(PENDING_NAV_KEY);
        // Small delay to let Expo Router finish initializing
        setTimeout(() => {
          routerRef.current.push(target as any);
        }, 100);
      }
    });
  }, [session?.user?.id, profile?.id]);
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
