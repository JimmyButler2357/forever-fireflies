// Shared subscription helpers — used by entry-detail and draft sync.
//
// These are extracted here because the same trial-start logic runs
// in two places: when an entry is saved directly (entry-detail.tsx)
// and when an offline draft syncs (useDraftSync.ts). Keeping it in
// one place means changes only need to happen once.

import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { profilesService } from '@/services/profiles.service';
import { capture } from '@/lib/posthog';

/** Start the free trial if this is the user's first entry.
 *  Idempotent — safe to call multiple times. The RPC only sets
 *  trial_started_at if it's currently NULL, and we skip the call
 *  entirely if the cached profile already has a value. */
export async function startTrialIfNeeded(): Promise<void> {
  const profile = useAuthStore.getState().profile;
  if (!profile || profile.trial_started_at) return;

  try {
    await profilesService.startTrial();
    // Update the cached profile locally instead of refetching from the server.
    // We know startTrial() sets trial_started_at = now(), so we can construct
    // the updated profile without a network call.
    const updatedProfile = { ...profile, trial_started_at: new Date().toISOString() };
    useAuthStore.getState().setProfile(updatedProfile);
    await useSubscriptionStore.getState().initialize(updatedProfile);
    capture('trial_started');
  } catch (err) {
    console.warn('Failed to start trial:', err);
    // Non-blocking — we'll retry on next app launch
  }
}

// ─── Paywall Constants ────────────────────────────────────

/** Value propositions shown on both the onboarding and post-trial paywalls. */
export const PAYWALL_VALUE_PROPS = [
  { icon: 'mic' as const, text: 'Unlimited voice & text memories' },
  { icon: 'cloud-done' as const, text: 'Recordings saved and searchable forever' },
  { icon: 'pricetag' as const, text: 'Organized by child, tag, or date' },
];

// PREMIUM_ENTITLEMENT moved to '@/lib/subscriptionConstants' to break
// circular imports. Import it from there instead.
export { PREMIUM_ENTITLEMENT } from '@/lib/subscriptionConstants';
