// RevenueCat wrapper — a thin layer around the react-native-purchases SDK.
//
// Think of RevenueCat as a "subscription valet" — it handles talking to
// Apple/Google about purchases so we don't have to deal with their
// complicated receipt validation APIs directly.
//
// IMPORTANT: Every function here is wrapped in try/catch because:
// 1. The placeholder API key will cause RevenueCat to throw errors
// 2. RevenueCat needs native modules that may not be available in dev
// 3. Network failures can happen anytime
//
// When RevenueCat fails, the app falls back to trial-based logic only
// (managed by the subscription store).

import Purchases from 'react-native-purchases';
import type { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { config } from '@/lib/config';
import { PREMIUM_ENTITLEMENT } from '@/lib/subscriptionConstants';

/** Configure RevenueCat with our API key.
 *  Call once on app launch (fire-and-forget — no need to await).
 *  Skips configuration if using the placeholder key since it would just throw. */
export function initRevenueCat(): void {
  if (config.revenueCatApiKey === 'PLACEHOLDER_REVENUECAT_KEY') {
    console.log('RevenueCat: skipping init — placeholder API key');
    return;
  }

  try {
    Purchases.configure({ apiKey: config.revenueCatApiKey });
  } catch (err) {
    console.warn('RevenueCat: configure failed:', err);
  }
}

/** Link a Supabase user to a RevenueCat customer.
 *  This ensures the user's subscription follows them across devices —
 *  like logging into Netflix on a new TV and seeing your plan is still active. */
export async function identifyUser(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
  } catch (err) {
    console.warn('RevenueCat: logIn failed:', err);
  }
}

/** Get the current customer's subscription info.
 *  Returns null if RevenueCat isn't configured or the call fails. */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    console.warn('RevenueCat: getCustomerInfo failed:', err);
    return null;
  }
}

/** Check if the user has an active "premium" entitlement.
 *  An "entitlement" is RevenueCat's term for "what the user gets" —
 *  it's separate from the product they bought because multiple products
 *  (monthly, annual) can all unlock the same entitlement ("premium"). */
export async function checkPremiumEntitlement(): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[PREMIUM_ENTITLEMENT];
  } catch (err) {
    console.warn('RevenueCat: checkPremiumEntitlement failed:', err);
    return false;
  }
}

/** Get available subscription packages (monthly, annual, etc.).
 *  These are configured in the RevenueCat dashboard under "Offerings."
 *  Returns null if no offerings are available or the call fails. */
export async function getOfferings(): Promise<PurchasesPackage[] | null> {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current && offerings.current.availablePackages.length > 0) {
      return offerings.current.availablePackages;
    }
    return null;
  } catch (err) {
    console.warn('RevenueCat: getOfferings failed:', err);
    return null;
  }
}

/** Execute a purchase for the given package.
 *  This triggers the native purchase flow (Google Play sheet or App Store sheet).
 *  Returns the updated CustomerInfo on success, or null on failure/cancellation. */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo | null> {
  try {
    const result = await Purchases.purchasePackage(pkg);
    return result.customerInfo;
  } catch (err: any) {
    // RevenueCat uses userCancelled to indicate the user dismissed the sheet
    // — that's not really an error, so we just return null quietly.
    if (err?.userCancelled) {
      return null;
    }
    console.warn('RevenueCat: purchasePackage failed:', err);
    return null;
  }
}

/** Restore previous purchases — useful when reinstalling the app or
 *  switching devices. Checks if any restored purchase includes the
 *  "premium" entitlement.
 *  Returns true if premium was found, false otherwise. */
export async function restorePurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    return !!info.entitlements.active[PREMIUM_ENTITLEMENT];
  } catch (err) {
    console.warn('RevenueCat: restorePurchases failed:', err);
    return false;
  }
}
