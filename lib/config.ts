// App-wide configuration — centralized env var reads.
// Think of this as the app's "settings panel" — one place to check
// all the toggles instead of having process.env scattered everywhere.
//
// Why centralize? If every file reads process.env directly, you end up
// with the same string ('EXPO_PUBLIC_BYPASS_PAYWALL') copy-pasted in
// a dozen places. One typo and things break silently. By reading them
// here once, every other file just imports `config.bypassPaywall`.

export const config = {
  /** When true, subscription checks are bypassed — full access always.
   *  Set via EXPO_PUBLIC_BYPASS_PAYWALL in eas.json for dev/preview builds.
   *  Think of it like a VIP pass that lets you skip the ticket booth. */
  bypassPaywall: process.env.EXPO_PUBLIC_BYPASS_PAYWALL === 'true',

  /** RevenueCat public API key. Placeholder until account is created.
   *  This is safe to include in the app — it's a *public* key, not a secret.
   *  It identifies your app to RevenueCat but can't be used to make purchases
   *  or access customer data on its own. */
  revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? 'PLACEHOLDER_REVENUECAT_KEY',

  // PostHog API key is read directly in lib/posthog.ts (not here).
  // Metro's OTA bundler wasn't replacing the env var when read through
  // config.ts, so we moved it to a direct process.env read — same
  // pattern Sentry uses for its DSN.

  // ─── Public URLs & Contact ─────────────────────────────
  // Centralized so every screen imports from one place.

  /** Public support email shown to users in-app and on store listings. */
  supportEmail: 'foreverfirefliesapp@gmail.com',

  /** Main website URL. */
  websiteUrl: 'https://foreverfireflies.app',

  /** Privacy policy — hosted on the website, linked from Settings + store listings. */
  privacyPolicyUrl: 'https://foreverfireflies.app/privacy',

  /** Terms of service — hosted on the website, linked from Settings + store listings. */
  termsOfServiceUrl: 'https://foreverfireflies.app/terms',
} as const;
