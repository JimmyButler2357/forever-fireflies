import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import {
  Merriweather_400Regular,
  Merriweather_700Bold,
  Merriweather_900Black,
} from '@expo-google-fonts/merriweather';

import { useAuthStore } from '@/stores/authStore';
import { useDraftStore } from '@/stores/draftStore';
import { authService } from '@/services/auth.service';
import { audioCleanupService } from '@/services/audioCleanup.service';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/lib/supabase';
import { initRevenueCat } from '@/lib/revenueCat';
import { colors } from '@/constants/theme';
import NotificationPermissionModal from '@/components/NotificationPermissionModal';
import * as Sentry from '@sentry/react-native';
import { initSentry } from '@/lib/sentry';
import { initPostHog } from '@/lib/posthog';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Initialize Sentry before any component renders so it catches
// errors from the very first render. Like arming an alarm before
// opening the door.
initSentry();

// Initialize PostHog analytics — same idea as Sentry but for
// tracking user behavior (which screens they visit, which buttons
// they tap) instead of errors. Also starts early so no events are missed.
initPostHog();

function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Merriweather_400Regular,
    Merriweather_700Bold,
    Merriweather_900Black,
  });

  const isLoading = useAuthStore((s) => s.isLoading);
  const initialize = useAuthStore((s) => s.initialize);
  const handleAuthChange = useAuthStore((s) => s.handleAuthChange);

  // Register push token and set up notification tap listeners.
  // Returns needsPermissionPrompt when the user opted in previously
  // but this device hasn't granted phone-level permission yet.
  const { needsPermissionPrompt, resolvePermissionMismatch } = useNotifications();
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // Show the modal when the hook detects the mismatch
  useEffect(() => {
    if (needsPermissionPrompt) setShowPermissionModal(true);
  }, [needsPermissionPrompt]);

  // On mount: check for an existing Supabase session.
  // Think of this as the app "waking up" and checking if someone
  // is already logged in (like a hotel checking if a guest's
  // keycard is still active).
  useEffect(() => {
    // Configure RevenueCat before initialize() so the native SDK has
    // a head start. initialize() will later call getCustomerInfo()
    // in the background — the more time the SDK has to warm up, the
    // faster that background call will resolve.
    initRevenueCat();

    initialize();

    // Reset any drafts stuck in 'syncing' (app was killed mid-sync).
    // Think of it like checking a conveyor belt after a power outage —
    // anything that was mid-delivery goes back to the "retry" pile.
    useDraftStore.getState().resetStaleSyncing();

    // Delayed orphan cleanup — runs 3 seconds after startup so it
    // doesn't compete with the critical auth + data loading.
    // Like a janitor who waits for the office to open before sweeping.
    setTimeout(() => {
      const draftAudioUris = useDraftStore.getState().drafts
        .map((d) => d.audioLocalUri)
        .filter((uri): uri is string => uri != null);
      audioCleanupService.cleanupOrphans(draftAudioUris);
    }, 3000);
  }, [initialize]);

  // Listen for auth state changes (login, logout, token refresh).
  // This keeps the store in sync whenever Supabase's auth state
  // changes — even if it happens in the background (e.g. token
  // auto-refresh). Think of it as a "doorbell" that rings whenever
  // someone enters or leaves.
  //
  // The PASSWORD_RECOVERY event fires after the deep link handler
  // below calls setSession() with tokens from the reset email link.
  // When that happens, we navigate to the reset-password screen.
  useEffect(() => {
    const { data: { subscription } } = authService.onAuthStateChange(
      (event, session) => {
        handleAuthChange(session);

        if (event === 'PASSWORD_RECOVERY') {
          router.replace('/(onboarding)/reset-password');
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [handleAuthChange, router]);

  // Deep link handler — catches URLs that open the app.
  //
  // Password reset flow:
  // 1. User clicks reset link in email → goes to Supabase server (https:// URL)
  // 2. Supabase verifies the token → redirects to our website:
  //    https://foreverfireflies.app/auth/callback#access_token=xxx&refresh_token=yyy&type=recovery
  // 3. Website redirect page opens the app via custom scheme:
  //    forever-fireflies://reset-password#access_token=xxx&refresh_token=yyy&type=recovery
  // 4. This handler picks up the tokens and calls setSession()
  // 5. Supabase fires PASSWORD_RECOVERY event → navigates to reset screen
  //
  // Why the website in the middle? Email clients block custom URL schemes
  // (forever-fireflies://) but allow https:// links. The website is a bridge
  // that email clients trust, which then redirects to the app.
  //
  // Two cases to handle:
  // - "Warm start": app is already open → addEventListener fires
  // - "Cold start": app was closed → getInitialURL() returns the URL
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      // The tokens live in the URL fragment (after #), not query params (after ?)
      // Example: forever-fireflies://reset-password#access_token=abc&refresh_token=def&type=recovery
      const hashIndex = url.indexOf('#');
      if (hashIndex === -1) return;

      const fragment = url.substring(hashIndex + 1);
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        // Tell Supabase "this person clicked the email link and is verified."
        // This creates a temporary session. Supabase will then fire the
        // PASSWORD_RECOVERY event in onAuthStateChange above.
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    };

    // Warm start: app is already running when the link is tapped
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    // Cold start: app was closed, the link opened it fresh
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => sub.remove();
  }, []);

  // Show a warm-colored loading screen while fonts load and
  // auth state is being checked. This prevents a flash of the
  // wrong screen (like briefly seeing onboarding when the user
  // is actually logged in).
  if (!fontsLoaded || isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(main)" />
        </Stack>
        <NotificationPermissionModal
          visible={showPermissionModal}
          onResolve={resolvePermissionMismatch}
          onDone={() => setShowPermissionModal(false)}
        />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
});

// In production, Sentry.wrap() adds a top-level error boundary and hooks
// into React Navigation for automatic screen-visit breadcrumbs.
// In dev, skip the wrapper entirely to avoid loading the Sentry SDK overhead.
export default __DEV__ ? RootLayout : Sentry.wrap(RootLayout);
