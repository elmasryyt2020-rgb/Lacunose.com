import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { RGF } from '../../constants/theme';
import { ChipIcon, Icon } from '../../components/Shared';

export default function ScreenLibrary() {
  const [selectedFilter, setSelectedFilter] = useState('All');
  
  const items = [
    { topic: 'GLP-1 agonists in pediatric obesity', field: 'Pediatrics', gaps: 8, date: 'Today', color: RGF.sky },
    { topic: 'CAR-T cell therapy in solid tumors', field: 'Oncology', gaps: 12, date: 'Yesterday', color: RGF.mint },
    { topic: 'Microbiome & colorectal cancer', field: 'Oncology', gaps: 6, date: 'Apr 12', color: RGF.butter },
    { topic: "Alzheimer's biomarkers in plasma", field: 'Neurology', gaps: 9, date: 'Apr 09', color: RGF.lavender },
    { topic: 'Sepsis early warning ML', field: 'ICU', gaps: 11, date: 'Apr 02', color: RGF.peach },
    { topic: 'Community HPV screening', field: 'Public health', gaps: 5, date: 'Mar 28', color: RGF.rose },
  ];

  const filters = ['All', 'Pediatrics', 'Oncology', 'Neurology', 'ICU'];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <ChipIcon name="filter" size={40} iconSize={16} />
          <ChipIcon name="search" size={40} iconSize={16} />
        </View>
        <Text style={{ fontFamily: RGF.display, fontSize: 40, lineHeight: 41, letterSpacing: -1.2, color: RGF.ink, marginBottom: 6 }}>
          Library
        </Text>
        <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted, marginBottom: 24 }}>
          {items.length} analyses · 51 saved gaps
        </Text>

        {/* filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
          {filters.map((f, i) => (
            <TouchableOpacity 
              key={f} activeOpacity={0.7} onPress={() => setSelectedFilter(f)}
              style={{
                paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99,
                backgroundColor: selectedFilter === f ? RGF.ink : '#fff',
                borderWidth: selectedFilter === f ? 0 : 1, borderColor: RGF.hair,
              }}>
              <Text style={{ 
                fontFamily: RGF.sansMedium, fontSize: 13, 
                color: selectedFilter === f ? '#fff' : RGF.ink 
              }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {items.map((it, i) => (
            <View key={i} style={{
              width: '48%', backgroundColor: '#fff', borderRadius: 22, padding: 14,
              borderWidth: 1, borderColor: RGF.hair, minHeight: 160,
              justifyContent: 'space-between'
            }}>
              <View style={{ gap: 10 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 12, backgroundColor: it.color,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="gap" size={16} color={RGF.ink} />
                </View>
                <Text style={{ fontFamily: RGF.display, fontSize: 18, lineHeight: 20, letterSpacing: -0.3, color: RGF.ink }}>
                  {it.topic}
                </Text>
              </View>
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>{it.field}</Text>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 12, color: RGF.inkSoft }}>{it.gaps} gaps · {it.date}</Text>
              </View>
            </View>
          ))}
        </View>
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
