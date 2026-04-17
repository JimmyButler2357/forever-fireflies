// PostHog analytics wrapper.
// Dev: events go nowhere (disabled). Prod: events sent to PostHog dashboard.
//
// Think of PostHog like a tally counter at a museum — it tracks which
// exhibits (screens) people visit, how long they stay, and which buttons
// they press. You never see it working, but the museum knows what's popular.

import PostHog from 'posthog-react-native';

// Read the API key directly from process.env instead of going through
// config.ts. Metro's babel transform replaces process.env.EXPO_PUBLIC_*
// at bundle time — but config.ts wasn't getting the replacement during
// OTA builds (likely a Metro caching quirk). Reading it here directly
// works reliably, same pattern Sentry uses for its DSN.
const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;

/** Property values PostHog accepts. We cast to `any` at the call site
 *  because PostHog's internal JsonType is not exported cleanly. */
type Props = Record<string, string | number | boolean | null | undefined>;

let posthog: PostHog | null = null;

/** Initialize PostHog — call once at app startup.
 *  In dev, this is a no-op so posthog stays null and all
 *  other functions return early via the null check. */
export function initPostHog() {
  if (__DEV__) return;
  if (!POSTHOG_API_KEY) {
    console.warn('PostHog API key not set — analytics disabled');
    return;
  }

  posthog = new PostHog(POSTHOG_API_KEY, {
    host: 'https://us.i.posthog.com',
    flushInterval: 30,
    flushAt: 20,
    captureAppLifecycleEvents: true,
  });
}

/**
 * Link analytics events to a specific user. Called on login so that
 * all events from this point forward are grouped under their user ID.
 *
 * Think of it like writing your name on a museum survey — now the
 * museum knows which exhibits YOU visited, not just "someone."
 */
export function identifyPostHogUser(
  userId: string,
  properties?: Props,
) {
  if (!posthog) return;
  posthog.identify(userId, properties as any);
}

/**
 * Clear the user identity on logout so the next user's events
 * aren't mixed in with the previous user.
 */
export function resetPostHogUser() {
  if (!posthog) return;
  posthog.reset();
}

/**
 * Track a specific event — the main function you'll call throughout the app.
 *
 * Usage:
 *   capture('entry_created', { type: 'voice', childCount: 2 })
 *   capture('recording_started')
 *   capture('firefly_jar_viewed')
 */
export function capture(
  event: string,
  properties?: Props,
) {
  if (!posthog) return;
  posthog.capture(event, properties as any);
}
