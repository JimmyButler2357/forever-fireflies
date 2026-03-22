// Sentry error tracking wrapper.
// Dev: errors go to console only. Prod: errors sent to Sentry dashboard.

import * as Sentry from '@sentry/react-native';

/**
 * Tag errors with the logged-in user so you can filter
 * crashes by who was affected in the Sentry dashboard.
 */
export function setSentryUser(userId: string, familyId: string | null) {
  if (__DEV__) return;
  Sentry.setUser({
    id: userId,
    segment: familyId ?? undefined,
  });
}

/** Clear user context on logout so post-logout errors aren't misattributed. */
export function clearSentryUser() {
  if (__DEV__) return;
  Sentry.setUser(null);
}

/** Report a caught exception to Sentry (no-op in dev). */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (__DEV__) return;
  Sentry.captureException(error, context);
}

export { Sentry };
