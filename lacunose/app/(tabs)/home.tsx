import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { RGF } from '../../constants/theme';
import { ChipIcon, Icon } from '../../components/Shared';

function ActionCard({ color, title, subtitle, glyph, onPress }: any) {
  return (
    <TouchableOpacity 
      activeOpacity={0.8} onPress={onPress}
      style={{
        backgroundColor: color, borderRadius: 26, padding: 18,
        height: 128, justifyContent: 'space-between', flex: 1,
      }}>
      <View style={{
        width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.7)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={glyph} size={18} color={RGF.ink} />
      </View>
      <View>
        <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: RGF.ink, letterSpacing: -0.3, marginBottom: 2 }}>{title}</Text>
        <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.inkSoft, opacity: 0.75 }}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

function RecentRow({ topic, count, time, color }: any) {
  return (
    <TouchableOpacity activeOpacity={0.7} style={{
      backgroundColor: '#fff', borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10,
      borderWidth: 1, borderColor: RGF.hair,
    }}>
      <View style={{
        width: 44, height: 44, borderRadius: 14, backgroundColor: color,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name="gap" size={20} color={RGF.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: RGF.sansMedium, fontSize: 14, color: RGF.ink, letterSpacing: -0.2, marginBottom: 2 }} numberOfLines={1}>{topic}</Text>
        <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>{count} gaps · {time}</Text>
      </View>
      <Icon name="chevR" size={16} color={RGF.muted} />
    </TouchableOpacity>
  );
}

export default function ScreenHome() {
  const router = useRouter();
  
  const recent = [
    { topic: 'GLP-1 agonists in pediatric obesity', count: 8, time: '2h ago', color: RGF.sky },
    { topic: 'CAR-T cell therapy in solid tumors', count: 12, time: 'Yesterday', color: RGF.mint },
    { topic: 'Microbiome & colorectal cancer', count: 6, time: '3d ago', color: RGF.butter },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* top row: question mark + bell */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <ChipIcon name="book" size={40} iconSize={18} />
          <TouchableOpacity activeOpacity={0.7} style={{ position: 'relative' }}>
            <ChipIcon name="bell" size={40} iconSize={18} />
            <View style={{
              position: 'absolute', top: -2, right: -2, backgroundColor: '#E55B3C',
              width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: '#fff', fontSize: 10, fontFamily: RGF.sansSemiBold }}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* hero headline */}
        <Text style={{ fontFamily: RGF.display, fontSize: 40, lineHeight: 41, letterSpacing: -1.2, color: RGF.ink, marginBottom: 4 }}>
          Hi Seif,
        </Text>
        <Text style={{ fontFamily: RGF.display, fontSize: 40, lineHeight: 41, letterSpacing: -1.2, color: RGF.ink, marginBottom: 28 }}>
          find your <Text style={{ fontStyle: 'italic' }}>next</Text>{'\n'}research gap.
        </Text>

        {/* quad of action cards */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <ActionCard color={RGF.sky} title="New topic" subtitle="Free-text search" glyph="search" onPress={() => router.push('/(tabs)/analyze')} />
          <ActionCard color={RGF.lavender} title="Upload PDF" subtitle="Seed paper" glyph="upload" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <ActionCard color={RGF.mint} title="PICO" subtitle="Clinical frame" glyph="dna" />
          <ActionCard color={RGF.butter} title="Ask AI" subtitle="Chat a gap" glyph="sparkle" />
        </View>

        {/* recent analyses */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: RGF.display, fontSize: 22, color: RGF.ink, letterSpacing: -0.4 }}>
            Recent analyses
          </Text>
          <TouchableOpacity>
            <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }}>See all</Text>
          </TouchableOpacity>
        </View>

        {recent.map((r, i) => (
          <RecentRow key={i} {...r} />
        ))}
        
        {/* spacer for nav bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* search / ask bar */}
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => router.push('/(tabs)/analyze')}
        style={{
          position: 'absolute', bottom: 100, left: 22, right: 22,
          backgroundColor: '#fff', borderRadius: 28, paddingVertical: 14, paddingHorizontal: 16,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          borderWidth: 1, borderColor: RGF.hair,
          shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 4,
        }}>
        <Icon name="search" size={18} color={RGF.muted} />
        <Text style={{ flex: 1, fontFamily: RGF.sans, fontSize: 14, color: RGF.muted }}>Ask or search for anything</Text>
        <ChipIcon name="mic" size={32} iconSize={14} bg={RGF.bg} color={RGF.ink} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RGF.bg,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 22,
    paddingBottom: 40,
  }
});
