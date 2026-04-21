import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../constants/theme';
import { ChipIcon, Icon, ScoreDial, CategoryPill } from '../../components/Shared';

function RecentCard({ topic, gap, novelty, category, color }: any) {
  const { RGF } = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.8} style={[styles.recentCard, { backgroundColor: RGF.surface, borderColor: RGF.hair }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="gap" size={18} color={RGF.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <CategoryPill kind={category} />
          <Text style={{ fontFamily: RGF.display, fontSize: 18, lineHeight: 22, letterSpacing: -0.3, color: RGF.ink, marginTop: 8 }} numberOfLines={2}>
            {gap}
          </Text>
          <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.inkSoft, marginTop: 4 }} numberOfLines={1}>
            From: {topic}
          </Text>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderColor: RGF.hair }}>
        <ScoreDial value={novelty} label="Novelty" color={RGF.ink} size={36} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontFamily: RGF.sansMedium, fontSize: 12, color: RGF.muted }}>Review analysis</Text>
          <Icon name="arrow" size={12} color={RGF.muted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ScreenHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { RGF } = useTheme();
  const [topic, setTopic] = useState('');

  const handleSearch = () => {
    if (topic.trim()) {
      router.push({ pathname: '/(tabs)/analyze', params: { search: topic } });
    }
  };

  const recent = [
    { topic: 'Pediatric obesity', gap: 'Long-term cardiometabolic safety under age 12', novelty: 9, category: 'future-work', color: RGF.sky },
    { topic: 'Solid tumors', gap: 'Efficacy combinations in late-stage variants', novelty: 7, category: 'pico', color: RGF.lavender },
    { topic: 'Microbiome', gap: 'Standardized sampling methodologies', novelty: 8, category: 'methodology', color: RGF.mint },
  ];

  return (
    <View style={[styles.container, { backgroundColor: RGF.bg }]}>
      {/* Ambient background blobs simulated with low opacity circles */}
      <View style={{ position: 'absolute', top: 100, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: RGF.butter, opacity: 0.3 }} />
      <View style={{ position: 'absolute', top: 380, left: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: RGF.sky, opacity: 0.2 }} />
      <View style={{ position: 'absolute', top: 250, right: 20, width: 150, height: 150, borderRadius: 75, backgroundColor: RGF.lavender, opacity: 0.25 }} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        
        {/* Header Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/library')}>
            <ChipIcon name="book" size={40} iconSize={18} bg={RGF.surface} />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={{ position: 'relative' }} onPress={() => router.push('/notifications')}>
            <ChipIcon name="bell" size={40} iconSize={18} bg={RGF.surface} />
            <View style={{
              position: 'absolute', top: -2, right: -2, backgroundColor: '#E55B3C',
              width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: '#fff', fontSize: 10, fontFamily: RGF.sansSemiBold }}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Text style={{ fontFamily: RGF.display, fontSize: 38, lineHeight: 40, letterSpacing: -1.2, color: RGF.ink }}>
            Hi Seif,
          </Text>
          <View style={{ backgroundColor: 'rgba(14,14,12,0.06)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontFamily: RGF.sansMedium, fontSize: 12, color: RGF.ink }}>12 gaps found</Text>
          </View>
        </View>
        
        <Text style={{ fontFamily: RGF.display, fontSize: 38, lineHeight: 40, letterSpacing: -1.2, color: RGF.ink, marginBottom: 28 }}>
          explore your <Text style={{ fontStyle: 'italic' }}>next</Text>{'\n'}research space.
        </Text>

        {/* Omni-Input Search */}
        <View style={styles.omniInputContainer}>
          <Text style={[styles.omniLabel, { fontFamily: RGF.sansMedium, color: RGF.muted }]}>What are you exploring today?</Text>
          <View style={[styles.omniBox, { backgroundColor: RGF.surface, borderColor: RGF.hair }]}>
            <TextInput 
              style={[styles.omniTextField, { fontFamily: RGF.sans, color: RGF.ink }]}
              placeholder="E.g. GLP-1 agonists in pediatric cohorts..."
              placeholderTextColor={RGF.muted}
              multiline
              value={topic}
              onChangeText={setTopic}
            />
            
            <View style={[styles.omniRow, { borderColor: RGF.hair }]}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.omniAction, { backgroundColor: RGF.bg, borderColor: RGF.hair }]}>
                  <Icon name="mic" size={16} color={RGF.ink} />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity onPress={handleSearch} activeOpacity={0.8} style={[styles.omniSubmit, { backgroundColor: RGF.ink, opacity: topic.trim().length > 0 ? 1 : 0.5 }]}>
                <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 14, color: RGF.bg, marginRight: 6 }}>Analyze</Text>
                <Icon name="arrow" size={14} color={RGF.bg} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Dashboard: Recent Analyses */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontFamily: RGF.display, fontSize: 24, color: RGF.ink, letterSpacing: -0.4 }}>
            Jump back in
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/library')}>
            <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }}>See history</Text>
          </TouchableOpacity>
        </View>

        <View style={{ gap: 14 }}>
          {recent.map((r, i) => (
            <RecentCard key={i} {...r} />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingHorizontal: 22 },
  omniInputContainer: { marginBottom: 40 },
  omniLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  omniBox: { borderRadius: 26, padding: 18, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.04, shadowRadius: 24, elevation: 6 },
  omniTextField: { fontSize: 18, minHeight: 80, textAlignVertical: 'top', padding: 0, marginBottom: 12 },
  omniRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1 },
  omniAction: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  omniSubmit: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20 },
  recentCard: { borderRadius: 24, padding: 18, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 3 }
});
