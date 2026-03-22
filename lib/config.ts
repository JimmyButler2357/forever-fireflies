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
} as const;
