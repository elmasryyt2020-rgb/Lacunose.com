import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../constants/theme';
import { ChipIcon, Icon } from '../../components/Shared';
import { useRouter } from 'expo-router';
import { useAnalyses } from '../../hooks/useAnalyses';
import { useSavedGaps } from '../../hooks/useSavedGaps';
import { FRAMES } from '../../lib/fields/frames';

export default function ScreenLibrary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { RGF } = useTheme();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isFilterActive, setIsFilterActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: analyses, isLoading } = useAnalyses();
  const { data: savedGaps } = useSavedGaps();
  const [activeFilter, setActiveFilter] = useState('All');

  // Build the filter chip list dynamically from the field frames the user
  // has actually analyzed in, plus two fixed "All" / "Saved" affordances.
  const availableFieldChips = useMemo(() => {
    const seen = new Set<string>();
    for (const a of analyses ?? []) {
      const f = (a as any)?.field as string | undefined;
      if (f && FRAMES[f]) seen.add(f);
    }
    // Stable order: iterate FRAMES keys so "Medicine" always before "Psychology"
    return Object.keys(FRAMES).filter((id) => seen.has(id));
  }, [analyses]);

  // "Saved" is a proper lookup now: an analysis counts as "Saved" iff any of
  // its gap_items.id appears in the user's saved_items table.
  const savedGapIds = useMemo(() => {
    const s = new Set<string>();
    for (const g of savedGaps ?? []) s.add((g as any).id);
    return s;
  }, [savedGaps]);

  const filteredItems = (analyses || []).filter((a: any) => {
    // Text search — topic substring, case-insensitive.
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (!String(a.topic ?? '').toLowerCase().includes(q)) return false;
    }
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Saved') {
      // gap_items in useAnalyses is the count aggregate shape, not rows —
      // so compare against the real saved-gaps set.
      const ids = Array.isArray(a.gap_items) && a.gap_items[0]?.id
        ? a.gap_items.map((g: any) => g.id)
        : [];
      return ids.some((id: string) => savedGapIds.has(id));
    }
    return a.field === activeFilter;
  });

  return (
    <View style={[styles.container, { backgroundColor: RGF.bg }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {isSearchActive ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <View style={{ flex: 1, backgroundColor: RGF.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: RGF.ink, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="search" size={16} color={RGF.ink} />
              <TextInput
                autoFocus
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search past analyses..."
                placeholderTextColor={RGF.muted}
                returnKeyType="search"
                style={{ flex: 1, fontFamily: RGF.sans, fontSize: 15, color: RGF.ink, padding: 0 }}
              />
            </View>
            <TouchableOpacity onPress={() => setIsSearchActive(false)}>
              <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: RGF.ink }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity onPress={() => setIsFilterActive(true)}>
              <ChipIcon name="filter" size={40} iconSize={16} bg={RGF.surface} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsSearchActive(true)}>
              <ChipIcon name="search" size={40} iconSize={16} bg={RGF.surface} />
            </TouchableOpacity>
          </View>
        )}
        <Text style={{ fontFamily: RGF.display, fontSize: 40, lineHeight: 41, letterSpacing: -1.2, color: RGF.ink, marginBottom: 6 }}>
          Library
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }}>
            {filteredItems.length} analyses history
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 22, height: 36, marginBottom: 24 }} style={{ marginHorizontal: -22, paddingHorizontal: 22 }}>
          {(() => {
            type Chip = { id: string; label: string };
            const chips: Chip[] = [
              { id: 'All', label: 'All' },
              { id: 'Saved', label: 'Saved' },
              ...availableFieldChips.map((id) => ({ id, label: FRAMES[id]?.label ?? id })),
            ];
            return chips.map((c) => (
              <TouchableOpacity key={c.id} onPress={() => setActiveFilter(c.id)} activeOpacity={0.7} style={{
                paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99,
                backgroundColor: activeFilter === c.id ? RGF.ink : RGF.surface,
                borderWidth: 1, borderColor: activeFilter === c.id ? RGF.ink : RGF.hair,
                justifyContent: 'center',
              }}>
                <Text style={{ fontFamily: activeFilter === c.id ? RGF.sansMedium : RGF.sans, fontSize: 13, color: activeFilter === c.id ? RGF.bg : RGF.ink }}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ));
          })()}
        </ScrollView>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {isLoading && <Text style={{ fontFamily: RGF.sans, color: RGF.muted, padding: 20 }}>Loading...</Text>}
          {filteredItems.map((it: any, i: number) => {
            const frameColor = (RGF as any)[FRAMES[it.field]?.rows[0]?.color || 'lavender'];
            return (
              <TouchableOpacity key={it.id} onPress={() => router.push(`/analyze/results?id=${it.id}`)} activeOpacity={0.8} style={{
                width: '48%', backgroundColor: RGF.surface, borderRadius: 22, padding: 14,
                borderWidth: 1, borderColor: RGF.hair, minHeight: 160,
                justifyContent: 'space-between'
              }}>
                <View style={{ gap: 10 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 12, backgroundColor: frameColor,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="gap" size={16} color={RGF.ink} />
                  </View>
                  <Text style={{ fontFamily: RGF.display, fontSize: 18, lineHeight: 20, letterSpacing: -0.3, color: RGF.ink }} numberOfLines={3}>
                    {it.topic}
                  </Text>
                </View>
                <View style={{ marginTop: 10 }}>
                  <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }} numberOfLines={1}>{FRAMES[it.field]?.label || it.field}</Text>
                  <Text style={{ fontFamily: RGF.sansMedium, fontSize: 12, color: RGF.inkSoft }}>{it.gap_items?.[0]?.count || 0} gaps · {new Date(it.created_at).toLocaleDateString()}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={isFilterActive} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: RGF.bg, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 26, paddingBottom: Math.max(40, insets.bottom + 20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 26, color: RGF.ink }}>Filters</Text>
              <TouchableOpacity onPress={() => setIsFilterActive(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: RGF.hair, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={RGF.ink} />
              </TouchableOpacity>
            </View>
            
            <View style={{ gap: 24 }}>
              <View>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>Sort by</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 99, backgroundColor: RGF.ink }}>
                    <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: RGF.bg }}>Newest</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 99, backgroundColor: RGF.surface, borderWidth: 1, borderColor: RGF.hair }}>
                    <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: RGF.ink }}>Oldest</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 99, backgroundColor: RGF.surface, borderWidth: 1, borderColor: RGF.hair }}>
                    <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: RGF.ink }}>Most Gaps</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>Date Range</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 99, backgroundColor: RGF.ink }}>
                    <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: RGF.bg }}>All time</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 18, borderRadius: 99, backgroundColor: RGF.surface, borderWidth: 1, borderColor: RGF.hair }}>
                    <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: RGF.ink }}>This month</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            <TouchableOpacity onPress={() => setIsFilterActive(false)} style={{ backgroundColor: RGF.ink, paddingVertical: 20, borderRadius: 28, alignItems: 'center', marginTop: 40 }}>
              <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: RGF.bg }}>Apply settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingHorizontal: 22, paddingBottom: 40 }
});
