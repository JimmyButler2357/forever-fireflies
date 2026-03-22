// Auth store — holds the user's authentication state.
//
// Think of this like your app's "ID card holder." It knows:
// - WHO is logged in (session + user)
// - Their PROFILE (display name, notification prefs, etc.)
// - Which FAMILY they belong to (familyId)
// - Whether they've completed ONBOARDING
//
// Important: We do NOT persist the session here — Supabase's client
// already saves it in AsyncStorage automatically. We only persist
// `hasCompletedOnboarding` as a fast local flag so the app can
// route instantly on launch without waiting for a network call.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

import { authService } from '@/services/auth.service';
import { profilesService } from '@/services/profiles.service';
import { familiesService } from '@/services/families.service';
import { notificationsService } from '@/services/notifications.service';
import { setSentryUser, clearSentryUser } from '@/lib/sentry';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { identifyUser } from '@/lib/revenueCat';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  // --- Persisted (survives app restart) ---
  hasCompletedOnboarding: boolean;

  // --- In-memory only (refreshed each launch) ---
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  familyId: string | null;
  isLoading: boolean;

  // --- Actions ---

  /** Called once on app launch. Checks for an existing Supabase session
   *  and loads the user's profile + family if found. */
  initialize: () => Promise<void>;

  /** Called when auth state changes (login, logout, token refresh).
   *  Loads profile + family on sign-in, clears everything on sign-out. */
  handleAuthChange: (session: Session | null) => Promise<void>;

  /** Sign in with email/password. Returns the session data. */
  signIn: (email: string, password: string) => Promise<void>;

  /** Sign up with email/password. Returns the session data. */
  signUp: (email: string, password: string) => Promise<void>;

  /** Sign out — clears Supabase session + local state. */
  signOut: () => Promise<void>;

  /** Mark onboarding as complete (local flag only — Supabase is
   *  updated separately via profilesService.completeOnboarding). */
  setOnboarded: () => void;

  /** Update the cached profile in the store (after editing profile fields). */
  setProfile: (profile: Profile) => void;

  /** Full reset — clears everything including onboarding flag. */
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // --- Persisted ---
      hasCompletedOnboarding: false,

      // --- In-memory ---
      session: null,
      user: null,
      profile: null,
      familyId: null,
      isLoading: true, // Start true — we're checking for a session

      // --- Actions ---

      initialize: async () => {
        try {
          const session = await authService.getSession();
          if (session) {
            await get().handleAuthChange(session);
          }
        } catch (error: any) {
          // If the cached token is stale (e.g. user was deleted from
          // Supabase dashboard), sign out cleanly so the app doesn't
          // get stuck with a zombie session.
          const message = error?.message ?? '';
          if (message.includes('Refresh Token') || message.includes('Invalid')) {
            console.warn('Stale session detected, signing out:', message);
            clearSentryUser();
            try { await authService.signOut(); } catch { /* ignore */ }
            set({ session: null, user: null, profile: null, familyId: null });
          } else {
            console.warn('Auth initialization failed:', error);
          }
        } finally {
          set({ isLoading: false });
        }
      },

      handleAuthChange: async (session: Session | null) => {
        if (!session) {
          // Signed out — clear everything except onboarding flag
          clearSentryUser();
          set({
            session: null,
            user: null,
            profile: null,
            familyId: null,
          });
          return;
        }

        // Signed in — load profile and family
        set({ session, user: session.user });

        // Tag errors with user ID immediately so any crash during
        // profile loading is still attributed to the right user.
        // familyId gets updated below once we know it.
        setSentryUser(session.user.id, null);

        try {
          const [profile, familyId] = await Promise.all([
            profilesService.getProfile(),
            familiesService.getMyFamilyId(),
          ]);

          set({
            profile,
            familyId,
            // Sync the local onboarding flag with the server value
            hasCompletedOnboarding: profile.onboarding_completed,
          });

          // Update Sentry context with familyId now that we know it
          setSentryUser(session.user.id, familyId);

          // Initialize subscription state from profile + RevenueCat.
          // This figures out if the user is on trial, has a paid plan,
          // or their trial has expired — and sets hasAccess accordingly.
          await useSubscriptionStore.getState().initialize(profile);

          // Link this user to RevenueCat so their subscription follows
          // them across devices (like logging into Netflix on a new TV).
          identifyUser(session.user.id).catch(() => {
            // RevenueCat may not be configured yet — that's fine
          });
        } catch (error) {
          const message = (error as Error)?.message ?? '';
          if (message.includes('Not authenticated')) {
            // The session token was rejected server-side (stale or revoked).
            // Sign out cleanly so the router sends the user back to login
            // instead of leaving them stuck with a session but no profile.
            console.warn('Session invalid during profile load, signing out');
            clearSentryUser();
            try { await authService.signOut(); } catch { /* ignore */ }
            set({ session: null, user: null, profile: null, familyId: null });
          } else {
            // Non-auth failure (e.g. network hiccup or trigger race condition).
            // Stay logged in so the user can retry — don't force a sign-out.
            console.warn('Failed to load profile/family:', error);
          }
        }
      },

      signIn: async (email, password) => {
        const { session } = await authService.signInWithEmail(email, password);
        if (session) {
          await get().handleAuthChange(session);
        }
      },

      signUp: async (email, password) => {
        const { session } = await authService.signUpWithEmail(email, password);
        if (session) {
          await get().handleAuthChange(session);
        }
      },

      signOut: async () => {
        // Deactivate the push token so the server stops sending
        // notifications to this device. Fire-and-forget — don't
        // block sign-out if this fails.
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          const pushToken = await AsyncStorage.getItem('ff_push_token');
          if (pushToken) {
            await notificationsService.deactivateDevice(pushToken);
            await AsyncStorage.removeItem('ff_push_token');
          }
        } catch (err) {
          console.warn('Failed to deactivate device on sign-out:', err);
        }

        await authService.signOut();
        clearSentryUser();
        set({
          session: null,
          user: null,
          profile: null,
          familyId: null,
          hasCompletedOnboarding: false,
        });
        // Reset subscription state so the next user starts fresh.
        useSubscriptionStore.setState({
          hasAccess: false,
          status: 'loading',
          trialDaysRemaining: 0,
        });
      },

      setOnboarded: () => set({ hasCompletedOnboarding: true }),

      setProfile: (profile) => set({ profile }),

      reset: () =>
        set({
          hasCompletedOnboarding: false,
          session: null,
          user: null,
          profile: null,
          familyId: null,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the onboarding flag — everything else is
      // refreshed from Supabase on each app launch.
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    },
  ),
);
