// Subscription constants — dependency-free file.
//
// These live in their own file (instead of subscriptionHelpers.ts) to
// break circular import chains. subscriptionHelpers imports both stores,
// so anything that imports from it inherits those dependencies. By
// putting simple constants here, files like revenueCat.ts and
// subscriptionStore.ts can grab them without pulling in the stores.

/** RevenueCat entitlement name — the "key" that unlocks premium access.
 *  Defined once here so a typo doesn't silently break subscription checks. */
export const PREMIUM_ENTITLEMENT = 'premium';
