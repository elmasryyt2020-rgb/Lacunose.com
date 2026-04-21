/**
 * RevenueCat wrapper.
 *
 * Notes:
 * - `react-native-purchases` needs a native build — it throws in Expo Go
 *   because the native module is missing. Every exported fn is wrapped in
 *   try/catch so a broken install never takes down the auth flow.
 * - Apple/Google IAP entitlements are case-sensitive: we standardize on
 *   lowercase 'pro' and 'premium' to match the backend webhook handler.
 */
import Purchases, { LOG_LEVEL, type PurchasesPackage, type CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';

let configured = false;

function platformKey(): string | undefined {
  return Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS
    : Platform.OS === 'android'
    ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID
    : undefined;
}

/**
 * Configure the RC SDK exactly once per app lifetime. Multiple calls are
 * no-ops; the SDK doesn't want to be re-configured on every auth change.
 * Safe to call from AuthProvider on every auth state change — we dedupe.
 */
export async function initBilling(userId: string): Promise<void> {
  if (configured) return;
  const apiKey = platformKey();
  if (!apiKey) {
    // No RC key configured (e.g. dev without IAP) — skip silently.
    return;
  }
  try {
    Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey, appUserID: userId });
    configured = true;
  } catch (err) {
    // Expo Go / missing native module: log once, don't crash callers.
    console.warn('[revenuecat] configure failed', (err as Error)?.message);
  }
}

export async function getOfferings() {
  if (!configured) return null;
  try {
    return await Purchases.getOfferings();
  } catch (err) {
    console.warn('[revenuecat] getOfferings failed', (err as Error)?.message);
    return null;
  }
}

/**
 * Purchase a package. Accepts either a RevenueCat `PurchasesPackage` object
 * (the correct, native call) or a string package identifier — in which case
 * we look it up inside the current offering and purchase that package.
 * Calling `purchasePackage('pro_monthly')` with a raw string previously
 * crashed the app; this preserves that call-site while doing the right thing.
 */
export async function purchasePackage(
  pkgOrId: PurchasesPackage | string
): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    let pkg: PurchasesPackage | undefined;
    if (typeof pkgOrId === 'string') {
      const offerings = await Purchases.getOfferings();
      const available = offerings.current?.availablePackages ?? [];
      pkg = available.find((p) => p.identifier === pkgOrId)
        ?? available.find((p) => p.product.identifier === pkgOrId);
      if (!pkg) throw new Error(`package_not_found:${pkgOrId}`);
    } else {
      pkg = pkgOrId;
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (err) {
    // `userCancelled` is a normal flow, not an error to propagate.
    const code = (err as { userCancelled?: boolean })?.userCancelled;
    if (code) return null;
    throw err;
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.restorePurchases();
  } catch (err) {
    console.warn('[revenuecat] restore failed', (err as Error)?.message);
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    return null;
  }
}
