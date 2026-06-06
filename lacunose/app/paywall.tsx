import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../constants/theme';
import { ChipIcon, Icon } from '../components/Shared';
import { useEntitlement } from '../hooks/useEntitlement';
import { getOfferings, purchasePackage, restorePurchases } from '../lib/billing/revenuecat';
import { isMockMode } from '../lib/mocks';
import type { PurchasesPackage } from 'react-native-purchases';

function TierCard({ tier, price, period, desc, featured, current, dark }: any) {
  const { RGF, theme } = useTheme();
  const bg = featured ? RGF.butter : dark ? RGF.ink : RGF.surface;
  const ink = dark ? RGF.bg : RGF.ink;
  const soft = dark ? (theme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)') : RGF.inkSoft;
  
  return (
    <View style={{
      backgroundColor: bg, borderRadius: 24, padding: 18,
      borderWidth: featured || dark ? 0 : 1, borderColor: RGF.hair,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <Text style={{ fontFamily: RGF.display, fontSize: 22, color: ink, letterSpacing: -0.4 }}>{tier}</Text>
        {current && (
          <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99, backgroundColor: RGF.ink }}>
            <Text style={{ fontFamily: RGF.sansMedium, color: RGF.bg, fontSize: 11 }}>Current</Text>
          </View>
        )}
        {featured && (
          <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99, backgroundColor: RGF.ink }}>
            <Text style={{ fontFamily: RGF.sansMedium, color: RGF.bg, fontSize: 11 }}>Most popular</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
        <Text style={{ fontFamily: RGF.display, fontSize: 32, color: ink, letterSpacing: -1 }}>{price}</Text>
        {period && <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: soft }}>{period}</Text>}
      </View>
      <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: soft, lineHeight: 18 }}>{desc}</Text>
    </View>
  );
}

export default function ScreenPaywall() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { RGF, displayShadow } = useTheme();
  const { data: entitlement } = useEntitlement();
  const queryClient = useQueryClient();
  const [proPackage, setProPackage] = useState<PurchasesPackage | null>(null);
  const [premiumPackage, setPremiumPackage] = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (isMockMode) return;
    (async () => {
      const offerings = await getOfferings();
      const available = offerings?.current?.availablePackages ?? [];
      // Match by product identifier — App Store Connect / Play Console SKUs.
      const pro = available.find(p => p.product.identifier.includes('pro.monthly')) ?? null;
      const premium = available.find(p => p.product.identifier.includes('premium.monthly')) ?? null;
      setProPackage(pro);
      setPremiumPackage(premium);
    })();
  }, []);

  const handleRestore = async () => {
    try {
      const info = await restorePurchases();
      queryClient.invalidateQueries({ queryKey: ['entitlement'] });
      if (info && Object.keys(info.entitlements.active).length > 0) {
        Alert.alert('Purchases restored', 'Your subscription is active.');
      } else {
        Alert.alert('No purchases to restore');
      }
    } catch (e) {
      Alert.alert('Restore failed', (e as Error)?.message ?? 'Unknown error');
    }
  };

  const handlePurchase = async (target: 'pro' | 'premium' = 'pro') => {
    if (purchasing) return;
    setPurchasing(true);
    try {
      if (isMockMode) {
        Alert.alert('Mock mode', `Would purchase the ${target} plan.`);
        router.back();
        return;
      }
      const pkg = target === 'premium' ? premiumPackage : proPackage;
      if (!pkg) {
        Alert.alert('Not available', 'This plan is not currently available. Please try again later.');
        return;
      }
      const result = await purchasePackage(pkg);
      if (result) {
        queryClient.invalidateQueries({ queryKey: ['entitlement'] });
        router.back();
      }
    } catch (e) {
      Alert.alert('Purchase failed', (e as Error)?.message ?? 'Unknown error');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: RGF.bg }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChipIcon name="close" size={40} iconSize={16} bg={RGF.surface} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }}>Restore</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontFamily: RGF.display, fontSize: 38, lineHeight: 39, letterSpacing: -1.2, color: RGF.ink, marginBottom: 6, ...displayShadow }}>
          Go <Text style={{ fontFamily: RGF.displayItalic }}>deeper.</Text>
        </Text>
        <Text style={{ fontFamily: RGF.sans, fontSize: 14, color: RGF.inkSoft, lineHeight: 20, marginBottom: 24 }}>
          Unlimited analyses, full gap lists,{'\n'}Zotero sync, advisor mode.
        </Text>

        {/* tier cards */}
        <View style={{ gap: 10, marginBottom: 20 }}>
          <TierCard tier="Free" price="$0" desc={`${entitlement?.analysesUsed || 0}/${entitlement?.tier === 'free' ? 3 : '∞'} analyses · top-5 gaps`} current={entitlement?.tier === 'free'} />
          <TierCard tier="Pro" price="$20" period="/ month" desc="50 analyses · full list · Zotero · advisor" featured={entitlement?.tier === 'free'} current={entitlement?.tier === 'pro'} />
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handlePurchase('pro')}
          disabled={purchasing}
          style={{
            backgroundColor: RGF.ink, borderRadius: 28, padding: 18,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            opacity: purchasing ? 0.55 : 1,
          }}>
          <View>
            <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 16, color: RGF.bg }}>
              {purchasing ? 'Processing…' : 'Start 7-day trial'}
            </Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, opacity: 0.6, color: RGF.bg, marginTop: 2 }}>
              {proPackage?.product?.priceString ?? '$20'}/mo after · cancel anytime
            </Text>
          </View>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: RGF.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow" size={18} color={RGF.ink} />
          </View>
        </TouchableOpacity>

        {/* App Store / Play review hard-requires these disclosures + links. */}
        <Text style={{ fontFamily: RGF.sans, fontSize: 11, color: RGF.muted, textAlign: 'center', lineHeight: 16, marginTop: 18, paddingHorizontal: 10 }}>
          A "Pro" subscription is available for $20 per month. The subscription auto-renews at this price unless canceled. You can cancel anytime in your device's subscription settings.
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 12 }}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={{ fontFamily: RGF.sansMedium, fontSize: 12, color: RGF.ink, textDecorationLine: 'underline' }}>Terms of Use (EULA)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={{ fontFamily: RGF.sansMedium, fontSize: 12, color: RGF.ink, textDecorationLine: 'underline' }}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingHorizontal: 22, paddingBottom: 40 }
});
