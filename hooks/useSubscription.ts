// useSubscription hook — a convenient way for components to read
// subscription state without importing the store directly.
//
// Think of this like a "view window" into the subscription store.
// Components use this hook to check things like:
// - "Does this user have access?" (to show/hide features)
// - "Are they on a trial?" (to show trial days remaining)
// - "Has their trial expired?" (to show the paywall)
//
// Using individual selectors (one per field) instead of returning
// the whole store prevents unnecessary re-renders. If only `status`
// changes, components that only read `hasAccess` won't re-render.

import { useSubscriptionStore } from '@/stores/subscriptionStore';

export function useSubscription() {
  const hasAccess = useSubscriptionStore((s) => s.hasAccess);
  const status = useSubscriptionStore((s) => s.status);
  const trialDaysRemaining = useSubscriptionStore((s) => s.trialDaysRemaining);
  return { hasAccess, status, trialDaysRemaining };
}
