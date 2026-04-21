import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RGF } from '../../constants/theme';
import { ChipIcon, Icon } from '../../components/Shared';
import { useRouter } from 'expo-router';

export default function ScreenLibrary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isFilterActive, setIsFilterActive] = useState(false);

  const items = [
    { topic: 'GLP-1 agonists in pediatric obesity', field: 'Current', gaps: 8, date: 'Today', color: RGF.sky },
    { topic: 'CAR-T cell therapy in solid tumors', field: 'Current', gaps: 12, date: 'Yesterday', color: RGF.mint },
    { topic: 'Microbiome & colorectal cancer', field: 'Archived', gaps: 6, date: 'Apr 12', color: RGF.butter },
    { topic: "Alzheimer's biomarkers in plasma", field: 'Archived', gaps: 9, date: 'Apr 09', color: RGF.lavender },
    { topic: 'Sepsis early warning ML', field: 'Archived', gaps: 11, date: 'Apr 02', color: RGF.peach },
    { topic: 'Community HPV screening', field: 'Archived', gaps: 5, date: 'Mar 28', color: RGF.rose },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {isSearchActive ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: RGF.ink, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="search" size={16} color={RGF.ink} />
              <TextInput autoFocus placeholder="Search past analyses..." placeholderTextColor={RGF.muted} style={{ flex: 1, fontFamily: RGF.sans, fontSize: 15, color: RGF.ink, padding: 0 }} />
            </View>
            <TouchableOpacity onPress={() => setIsSearchActive(false)}>
              <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: RGF.ink }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity onPress={() => setIsFilterActive(true)}>
              <ChipIcon name="filter" size={40} iconSize={16} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsSearchActive(true)}>
              <ChipIcon name="search" size={40} iconSize={16} />
            </TouchableOpacity>
          </View>
        )}
        <Text style={{ fontFamily: RGF.display, fontSize: 40, lineHeight: 41, letterSpacing: -1.2, color: RGF.ink, marginBottom: 6 }}>
          Library
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }}>
            {items.length} analyses history
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 22, height: 36, marginBottom: 24 }} style={{ marginHorizontal: -22, paddingHorizontal: 22 }}>
          {['All', 'Saved', 'Medicine', 'Computer Science', 'Archived'].map((cat, i) => (
            <TouchableOpacity key={i} activeOpacity={0.7} style={{
              paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99,
              backgroundColor: i === 0 ? RGF.ink : '#fff',
              borderWidth: 1, borderColor: i === 0 ? RGF.ink : RGF.hair,
              justifyContent: 'center',
            }}>
              <Text style={{ fontFamily: i === 0 ? RGF.sansMedium : RGF.sans, fontSize: 13, color: i === 0 ? '#fff' : RGF.ink }}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {items.map((it, i) => (
            <TouchableOpacity key={i} onPress={() => router.push('/analyze/results')} activeOpacity={0.8} style={{
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
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={isFilterActive} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: RGF.bg, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 26, paddingBottom: Math.max(40, insets.bottom + 20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 26, color: RGF.ink }}>Filters</Text>
              <TouchableOpacity onPress={() => setIsFilterActive(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={RGF.ink} />
              </TouchableOpacity>
            </View>
            
            <View style={{ gap: 24 }}>
              <View>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>Sort by</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 99, backgroundColor: RGF.ink }}>
                    <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: '#fff' }}>Newest</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 99, backgroundColor: '#fff', borderWidth: 1, borderColor: RGF.hair }}>
                    <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: RGF.ink }}>Oldest</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 99, backgroundColor: '#fff', borderWidth: 1, borderColor: RGF.hair }}>
                    <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: RGF.ink }}>Most Gaps</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>Date Range</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 99, backgroundColor: RGF.ink }}>
                    <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: '#fff' }}>All time</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 99, backgroundColor: '#fff', borderWidth: 1, borderColor: RGF.hair }}>
                    <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: RGF.ink }}>This month</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            <TouchableOpacity onPress={() => setIsFilterActive(false)} style={{ backgroundColor: RGF.ink, paddingVertical: 20, borderRadius: 28, alignItems: 'center', marginTop: 40 }}>
              <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: '#fff' }}>Apply settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
