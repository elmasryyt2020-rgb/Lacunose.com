import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

export async function initBilling(userId: string) {
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({
    apiKey: Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS!
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID!,
    appUserID: userId,
  });
}

export async function getOfferings() { 
  return Purchases.getOfferings(); 
}

export async function purchasePackage(pkg: any) { 
  return Purchases.purchasePackage(pkg); 
}

export async function restorePurchases() { 
  return Purchases.restorePurchases(); 
}
