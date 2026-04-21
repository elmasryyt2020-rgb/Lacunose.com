import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { RGF } from '../../constants/theme';
import { ChipIcon, Icon, CategoryPill } from '../../components/Shared';

function SettingRow({ icon, label, destructive }: any) {
  return (
    <TouchableOpacity style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: RGF.hair,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon name={icon} size={18} color={destructive ? RGF.rose : RGF.ink} />
        <Text style={{ fontFamily: RGF.sansMedium, fontSize: 15, color: destructive ? RGF.rose : RGF.ink }}>{label}</Text>
      </View>
      <Icon name="chevR" size={14} color={RGF.muted} />
    </TouchableOpacity>
  );
}

export default function ScreenMe() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const savedGaps = [
    { title: 'Long-term cardiometabolic safety under age 12', cat: 'future-work', color: RGF.sky },
    { title: 'Dose-response in adolescents with Down syndrome', cat: 'pico', color: RGF.lavender },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <Text style={{ fontFamily: RGF.display, fontSize: 40, lineHeight: 41, letterSpacing: -1.2, color: RGF.ink }}>
            Profile
          </Text>
          <ChipIcon name="settings" size={40} iconSize={16} />
        </View>


        <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: RGF.hair, marginBottom: 32, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: RGF.butter, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: RGF.display, fontSize: 28, color: RGF.ink }}>S</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: RGF.display, fontSize: 24, letterSpacing: -0.5, color: RGF.ink }}>Seif Elmasry</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }}>seif@researcher.edu</Text>
          </View>
        </View>

        <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
          Subscription
        </Text>
        <TouchableOpacity onPress={() => router.push('/paywall')} style={{ backgroundColor: RGF.ink, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <View>
            <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: '#fff' }}>Pro Plan</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Renews May 14</Text>
          </View>
          <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: '#fff' }}>
            <Text style={{ fontFamily: RGF.sansMedium, fontSize: 12, color: RGF.ink }}>Manage</Text>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Saved Gaps
          </Text>
          <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>{savedGaps.length} total</Text>
        </View>
        
        <View style={{ gap: 10, marginBottom: 32 }}>
          {savedGaps.map((gap, i) => (
            <TouchableOpacity key={i} onPress={() => router.push('/analyze/detail')} style={{ backgroundColor: '#fff', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: RGF.hair, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: gap.color, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bookmark" size={16} color={RGF.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <CategoryPill kind={gap.cat} />
                <Text style={{ fontFamily: RGF.display, fontSize: 18, lineHeight: 21, letterSpacing: -0.3, color: RGF.ink, marginTop: 6 }} numberOfLines={2}>
                  {gap.title}
                </Text>
              </View>
              <Icon name="chevR" size={16} color={RGF.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 18, paddingVertical: 4, borderWidth: 1, borderColor: RGF.hair }}>
          <SettingRow icon="person" label="Edit Profile" />
          <SettingRow icon="book" label="ORCID Integration" />
          <SettingRow icon="bell" label="Notifications" />
          <SettingRow icon="close" label="Sign Out" destructive />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: RGF.bg },
  scrollContent: { paddingTop: 60, paddingHorizontal: 22, paddingBottom: 40 }
});
