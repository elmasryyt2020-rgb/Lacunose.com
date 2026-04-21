import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../constants/theme';
import { ChipIcon, Icon } from '../components/Shared';
import { useEntitlement } from '../hooks/useEntitlement';
import { purchasePackage, restorePurchases } from '../lib/billing/revenuecat';

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
  const { RGF } = useTheme();
  const { data: entitlement } = useEntitlement();

  const handleRestore = async () => {
    try {
      await restorePurchases();
    } catch (e) {
      console.warn(e);
    }
  };

  const handlePurchase = async () => {
    try {
      await purchasePackage('pro_monthly'); // Assume some method to fetch packages
      router.back();
    } catch (e) {
      console.warn(e);
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
        <Text style={{ fontFamily: RGF.display, fontSize: 38, lineHeight: 39, letterSpacing: -1.2, color: RGF.ink, marginBottom: 6 }}>
          Go <Text style={{ fontStyle: 'italic' }}>deeper.</Text>
        </Text>
        <Text style={{ fontFamily: RGF.sans, fontSize: 14, color: RGF.inkSoft, lineHeight: 20, marginBottom: 24 }}>
          Unlimited analyses, full gap lists,{'\n'}Zotero sync, advisor mode.
        </Text>

        {/* tier cards */}
        <View style={{ gap: 10, marginBottom: 20 }}>
          <TierCard tier="Free" price="$0" desc={`${entitlement?.analysesUsed || 0}/${entitlement?.tier === 'free' ? 3 : '∞'} analyses · top-5 gaps`} current={entitlement?.tier === 'free'} />
          <TierCard tier="Pro" price="$20" period="/ month" desc="20 analyses · full list · Zotero · advisor" featured={entitlement?.tier === 'free'} current={entitlement?.tier === 'pro'} />
        </View>

        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handlePurchase}
          style={{ backgroundColor: RGF.ink, borderRadius: 28, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 16, color: RGF.bg }}>Start 7-day trial</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, opacity: 0.6, color: RGF.bg, marginTop: 2 }}>$20/mo after · cancel anytime</Text>
          </View>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: RGF.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow" size={18} color={RGF.ink} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingHorizontal: 22, paddingBottom: 40 }
});
