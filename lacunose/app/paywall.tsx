import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { RGF } from '../constants/theme';
import { ChipIcon, Icon } from '../components/Shared';

function TierCard({ tier, price, period, desc, featured, current, dark }: any) {
  const bg = featured ? RGF.butter : dark ? RGF.ink : '#fff';
  const ink = dark ? '#fff' : RGF.ink;
  const soft = dark ? 'rgba(255,255,255,0.6)' : RGF.inkSoft;
  
  return (
    <View style={{
      backgroundColor: bg, borderRadius: 24, padding: 18,
      borderWidth: featured || dark ? 0 : 1, borderColor: RGF.hair,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <Text style={{ fontFamily: RGF.display, fontSize: 22, color: ink, letterSpacing: -0.4 }}>{tier}</Text>
        {current && (
          <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99, backgroundColor: RGF.ink }}>
            <Text style={{ fontFamily: RGF.sansMedium, color: '#fff', fontSize: 11 }}>Current</Text>
          </View>
        )}
        {featured && (
          <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99, backgroundColor: RGF.ink }}>
            <Text style={{ fontFamily: RGF.sansMedium, color: '#fff', fontSize: 11 }}>Most popular</Text>
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChipIcon name="close" size={40} iconSize={16} />
          </TouchableOpacity>
          <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }}>Restore</Text>
        </View>
        <Text style={{ fontFamily: RGF.display, fontSize: 38, lineHeight: 39, letterSpacing: -1.2, color: RGF.ink, marginBottom: 6 }}>
          Go <Text style={{ fontStyle: 'italic' }}>deeper.</Text>
        </Text>
        <Text style={{ fontFamily: RGF.sans, fontSize: 14, color: RGF.inkSoft, lineHeight: 20, marginBottom: 24 }}>
          Unlimited analyses, full gap lists,{'\n'}Zotero sync, advisor mode.
        </Text>

        {/* tier cards */}
        <View style={{ gap: 10, marginBottom: 20 }}>
          <TierCard tier="Free" price="$0" desc="3 analyses/month · top-5 gaps" current />
          <TierCard tier="Pro" price="$20" period="/ month" desc="20 analyses · full list · Zotero · advisor" featured />
          {/* Removed Team tier per user's request */}
        </View>

        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{ backgroundColor: RGF.ink, borderRadius: 28, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 16, color: '#fff' }}>Start 7-day trial</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, opacity: 0.6, color: '#fff', marginTop: 2 }}>$20/mo after · cancel anytime</Text>
          </View>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow" size={18} color={RGF.ink} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: RGF.bg },
  scrollContent: { paddingTop: 60, paddingHorizontal: 22, paddingBottom: 40 }
});
