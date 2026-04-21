import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { RGF } from '../../constants/theme';
import { ChipIcon, Icon } from '../../components/Shared';

function FilterRow({ label, value, muted, last }: any) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 18,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: RGF.hair,
    }}>
      <Text style={{ fontFamily: RGF.sansMedium, fontSize: 14, color: RGF.ink }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: muted ? RGF.muted : RGF.ink }}>{value}</Text>
        <Icon name="chevR" size={14} color={RGF.muted} />
      </View>
    </View>
  );
}

export default function ScreenAnalyze() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/home')}>
            <ChipIcon name="close" size={40} iconSize={16} />
          </TouchableOpacity>
          <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }}>2 of 3 used this month</Text>
        </View>

        <Text style={{ fontFamily: RGF.display, fontSize: 42, lineHeight: 43, letterSpacing: -1.3, color: RGF.ink, marginBottom: 32 }}>
          What area of{'\n'}medicine do you{'\n'}want to <Text style={{ fontStyle: 'italic' }}>explore?</Text>
        </Text>

        {/* topic box */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 26, padding: 20, minHeight: 180, marginBottom: 28,
          borderWidth: 1, borderColor: RGF.hair,
        }}>
          <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
            Topic
          </Text>
          <TextInput 
            style={{ flex: 1, fontFamily: RGF.sans, fontSize: 20, lineHeight: 28, color: RGF.ink, letterSpacing: -0.3, textAlignVertical: 'top' }}
            defaultValue="GLP-1 agonists for pediatric obesity"
            multiline
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <ChipIcon name="paperclip" size={32} iconSize={14} bg={RGF.bg} />
              <ChipIcon name="mic" size={32} iconSize={14} bg={RGF.bg} />
            </View>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>32 / 240</Text>
          </View>
        </View>

        {/* filter toggles */}
        <View style={{ backgroundColor: '#fff', borderRadius: 24, paddingVertical: 6, borderWidth: 1, borderColor: RGF.hair, marginBottom: 24 }}>
          <FilterRow label="Include preprints" value="On" />
          <FilterRow label="Open-access only" value="Off" muted />
          <FilterRow label="Years" value="2019–2026" />
          <FilterRow label="Study designs" value="All" last />
        </View>

        {/* CTA */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => router.push('/analyze/results')}
          style={{
            backgroundColor: RGF.ink, borderRadius: 28, padding: 20,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
          <View>
            <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: '#fff', letterSpacing: -0.3 }}>Find gaps</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>≈ 45 sec · 500 papers</Text>
          </View>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow" size={20} color={RGF.ink} />
          </View>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: RGF.bg,
  },
  scrollContent: {
    paddingTop: 60, paddingHorizontal: 22, paddingBottom: 40,
  }
});
