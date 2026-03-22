// Sentry error tracking wrapper.
// Dev: errors go to console only. Prod: errors sent to Sentry dashboard.

import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** Initialize Sentry — call once at app startup, before any component renders. */
export function initSentry() {
  if (__DEV__) return;
  if (!DSN) {
    console.warn('Sentry DSN not set — error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0,   // Error tracking only (bump to 0.2 for performance later)
    sampleRate: 1.0,       // Send 100% of errors (fine at small scale)
    maxBreadcrumbs: 50,    // Trail of user actions before each crash
    enabled: !__DEV__,
  });
}

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
