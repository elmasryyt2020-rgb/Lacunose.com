import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { isMockMode } from '../lib/mocks';
import Purchases from 'react-native-purchases';

export function useEntitlement() {
  return useQuery({
    queryKey: ['entitlement'],
    queryFn: async () => {
      if (isMockMode) {
        return { tier: 'free', analysesUsed: 2, analysesCap: 3, willRenew: false, periodEnd: new Date(Date.now() + 86400000 * 15).toISOString() };
      }
      
      const { data: dbSub, error } = await supabase.from('subscriptions').select('*').single();
      let tier = dbSub?.tier || 'free';
      let periodEnd = dbSub?.period_end || new Date().toISOString();
      let willRenew = dbSub?.will_renew || false;
      let analysesUsed = dbSub?.analyses_used_this_period || 0;
      // Caps match backend env: FREE_MONTHLY_ANALYSES=3, PRO=50, PREMIUM=150.
      // Server is the source of truth; if it ever changes, it also updates
      // subscriptions.tier — we only map tier → cap here for UI display.
      const CAP: Record<string, number> = { free: 3, pro: 50, premium: 150 };

      try {
        const customerInfo = await Purchases.getCustomerInfo();
        // Entitlement identifiers are lowercase to match the backend
        // RevenueCat webhook handler (see lacunose-backend/src/edge/routes/webhooks.ts).
        if (customerInfo.entitlements.active['premium']) {
          tier = 'premium';
        } else if (customerInfo.entitlements.active['pro']) {
          tier = 'pro';
        }
      } catch (e) {
        console.warn('RevenueCat error', e);
      }

      const analysesCap = CAP[tier] ?? 3;
      
      return { tier, analysesUsed, analysesCap, willRenew, periodEnd };
    }
  });
}
