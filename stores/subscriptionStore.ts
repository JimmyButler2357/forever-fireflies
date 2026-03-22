// Subscription store — tracks whether the user has access to the app.
//
// Think of this like a movie theater ticket checker. It knows:
// - Does this person have a valid ticket? (hasAccess)
// - What kind of ticket? (status: trial, active subscription, or expired)
// - If they're on a free trial, how many days are left? (trialDaysRemaining)
//
// This store is NOT persisted — it's recomputed fresh each time the app
// launches by calling initialize() with the user's profile. That way
// we always have the latest state from the server + RevenueCat.
//
// The flow works like this:
// 1. User opens app → authStore loads their profile
// 2. authStore calls subscriptionStore.initialize(profile)
// 3. We check: bypass flag? → RevenueCat subscription? → trial status?
// 4. The first "yes" wins and sets hasAccess accordingly.

import { create } from 'zustand';
import type { Database } from '@/lib/database.types';
import { config } from '@/lib/config';
import { daysAgo } from '@/lib/dateUtils';
import { PREMIUM_ENTITLEMENT } from '@/lib/subscriptionHelpers';
import {
  checkPremiumEntitlement,
  getCustomerInfo,
  restorePurchases as rcRestorePurchases,
} from '@/lib/revenueCat';

type Profile = Database['public']['Tables']['profiles']['Row'];

/** The possible subscription states:
 *  - 'loading': still checking (brief, on app launch)
 *  - 'trial': using the 7-day free trial
 *  - 'active': paid subscription is active
 *  - 'expired': trial ended and no active subscription */
type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'loading';

interface SubscriptionState {
  /** Whether the user can use the app's features (record, edit, etc.) */
  hasAccess: boolean;
  /** Current subscription status */
  status: SubscriptionStatus;
  /** Days remaining in the free trial (0 if not on trial) */
  trialDaysRemaining: number;

  /** Called on app launch after profile loads. Figures out the user's
   *  subscription state by checking (in order):
   *  1. Dev bypass flag → always grant access
   *  2. RevenueCat premium entitlement → paid subscriber
   *  3. Profile trial_started_at → compute trial days remaining */
  initialize: (profile: Profile) => Promise<void>;

  /** Called after a successful in-app purchase. Immediately grants access
   *  so the user doesn't have to wait for a refresh. */
  onPurchaseComplete: () => void;

  /** Try to restore a previous purchase (e.g. after reinstalling the app).
   *  Returns true if a premium entitlement was found. */
  restorePurchases: () => Promise<boolean>;

  /** Re-check RevenueCat for the latest customer info.
   *  Useful for syncing state after a purchase happens outside the app. */
  refresh: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>()((set) => ({
  hasAccess: false,
  status: 'loading',
  trialDaysRemaining: 0,

  initialize: async (profile: Profile) => {
    // Gate 1: Dev bypass — skip everything and grant full access.
    // This is set via EXPO_PUBLIC_BYPASS_PAYWALL=true in eas.json
    // so development and preview builds never hit the paywall.
    if (config.bypassPaywall) {
      set({ hasAccess: true, status: 'active', trialDaysRemaining: 0 });
      return;
    }

    // Gate 2: RevenueCat — check if the user has a paid subscription.
    // This calls RevenueCat's servers to see if there's an active
    // "premium" entitlement (could be monthly or annual plan).
    const isPremium = await checkPremiumEntitlement();
    if (isPremium) {
      set({ hasAccess: true, status: 'active', trialDaysRemaining: 0 });
      return;
    }

    // Gate 3: Trial — check the profile's trial_started_at timestamp.
    // Three sub-cases:
    //   a) trial_started_at is NULL → trial hasn't started yet (first entry
    //      not saved). Grant access with 7 days "banked."
    //   b) Less than 7 days elapsed → trial is active, compute remaining days.
    //   c) 7+ days elapsed → trial expired, no access.
    if (!profile.trial_started_at) {
      // Trial not started yet — user hasn't saved their first entry.
      // Give them access so they can explore and record that first one.
      set({ hasAccess: true, status: 'trial', trialDaysRemaining: 7 });
      return;
    }

    const daysElapsed = daysAgo(profile.trial_started_at);

    if (daysElapsed < 7) {
      // Trial is still active — compute how many days are left.
      // Example: started 3 days ago → 7 - 3 = 4 days remaining.
      set({
        hasAccess: true,
        status: 'trial',
        trialDaysRemaining: 7 - daysElapsed,
      });
    } else {
      // Trial expired — no access until they subscribe.
      set({ hasAccess: false, status: 'expired', trialDaysRemaining: 0 });
    }
  },

  onPurchaseComplete: () => {
    // Immediately grant access after a purchase so the user doesn't
    // see the paywall for even a moment after paying.
    set({ hasAccess: true, status: 'active', trialDaysRemaining: 0 });
  },

  restorePurchases: async () => {
    // Ask RevenueCat to check Apple/Google for any previous purchases
    // tied to this user's account. If found, grant access.
    const hasPremium = await rcRestorePurchases();
    if (hasPremium) {
      set({ hasAccess: true, status: 'active', trialDaysRemaining: 0 });
    }
    return hasPremium;
  },

  refresh: async () => {
    // Re-fetch customer info from RevenueCat and update state.
    // Useful if the user subscribed via the Play Store / App Store
    // outside of our app (e.g. from a web link or subscription settings).
    const info = await getCustomerInfo();
    if (info && info.entitlements.active[PREMIUM_ENTITLEMENT]) {
      set({ hasAccess: true, status: 'active', trialDaysRemaining: 0 });
    }
  },
}));
