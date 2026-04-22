import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../constants/theme';
import { ChipIcon, CategoryPill } from '../../components/Shared';
import { useGapItem } from '../../hooks/useGapItem';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { isMockMode } from '../../lib/mocks';

function ScoreBig({ value, label, color }: any) {
  const { RGF, displayShadow } = useTheme();
  return (
    <View style={{
      flex: 1, backgroundColor: color, borderRadius: 20,
      paddingVertical: 14, paddingHorizontal: 12, aspectRatio: 1 / 1.05,
      justifyContent: 'space-between',
    }}>
      <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.inkSoft, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ fontFamily: RGF.display, fontSize: 48, lineHeight: 48, color: RGF.ink, letterSpacing: -1.5, ...displayShadow }}>
        {value}<Text style={{ fontSize: 18, color: RGF.muted }}>/10</Text>
      </Text>
    </View>
  );
}

export default function ScreenDetail() {
  const router = useRouter();
  const { RGF, displayShadow } = useTheme();
  const { gapId } = useLocalSearchParams<{ gapId: string }>();
  const { data: gap, isLoading } = useGapItem(gapId || '');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isMockMode || !user?.id || !gapId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('saved_items')
        .select('gap_id')
        .eq('user_id', user.id)
        .eq('gap_id', gapId)
        .maybeSingle();
      if (!cancelled) setIsSaved(!!data);
    })();
    return () => { cancelled = true; };
  }, [gapId, user?.id]);

  const toggleSaved = async () => {
    if (saving || !user?.id || !gapId || isMockMode) return;
    setSaving(true);
    const next = !isSaved;
    setIsSaved(next);
    try {
      if (next) {
        const { error } = await supabase.from('saved_items').insert({ user_id: user.id, gap_id: gapId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saved_items').delete().eq('user_id', user.id).eq('gap_id', gapId);
        if (error) throw error;
      }
      void queryClient.invalidateQueries({ queryKey: ['savedGaps'] });
    } catch {
      setIsSaved(!next);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !gap) {
    return (
      <View style={[styles.container, { backgroundColor: RGF.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontFamily: RGF.sans, color: RGF.muted }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: RGF.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChipIcon name="chevL" size={40} iconSize={14} bg={RGF.surface} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleSaved} activeOpacity={0.7} disabled={saving}>
            <ChipIcon
              name="bookmark"
              size={40}
              iconSize={16}
              bg={isSaved ? RGF.ink : RGF.surface}
              color={isSaved ? RGF.bg : RGF.ink}
            />
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 18 }}>
          <CategoryPill kind={gap.category || 'future-work'} />
        </View>

        <Text style={{ fontFamily: RGF.display, fontSize: 30, lineHeight: 32, letterSpacing: -0.8, color: RGF.ink, marginBottom: 20, ...displayShadow }}>
          {gap.title}
        </Text>

        {/* scores */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 22 }}>
          <ScoreBig value={gap.novelty_score || 0} label="Novelty" color={RGF.sky} />
          <ScoreBig value={gap.feasibility_score || 0} label="Feasibility" color={RGF.mint} />
          <ScoreBig value={gap.evidence_density || 0} label="Evidence" color={RGF.butter} />
        </View>

        {/* research question */}
        <View style={{ backgroundColor: RGF.ink, borderRadius: 24, padding: 20, marginBottom: 14 }}>
          <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: RGF.bg, opacity: 0.5, marginBottom: 10 }}>
            Suggested research question
          </Text>
          <Text style={{ fontFamily: RGF.display, fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: RGF.bg }}>
            {gap.research_question}
          </Text>
        </View>

        {/* method rec */}
        <View style={{ backgroundColor: RGF.surface, borderRadius: 24, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: RGF.hair }}>
          <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: RGF.muted, marginBottom: 8 }}>
            Suggested method
          </Text>
          <Text style={{ fontFamily: RGF.sans, fontSize: 15, color: RGF.ink, lineHeight: 22, marginBottom: 10 }}>
            <Text style={{ fontFamily: RGF.sansSemiBold }}>{gap.suggested_method}</Text>
          </Text>
          <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>Est. N ≈ {gap.suggested_n}</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>·</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>{gap.suggested_duration_months} mo</Text>
          </View>
        </View>

        {/* evidence panel */}
        {(gap.evidence || []).length > 0 && (
          <View style={{ backgroundColor: RGF.surface, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: RGF.hair }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 20, color: RGF.ink, letterSpacing: -0.3, ...displayShadow }}>Evidence</Text>
              <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>{(gap.evidence || []).length} papers</Text>
            </View>
            {(gap.evidence || []).map((e: any, i: number) => (
              <View key={i} style={{ paddingTop: 12, paddingBottom: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: RGF.hair }}>
                <Text style={{ fontFamily: RGF.displayItalic, fontSize: 15, lineHeight: 21, color: RGF.ink, marginBottom: 8 }}>
                  "{e.quote}"
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontFamily: RGF.sans, fontSize: 11, color: RGF.muted }}>{e.authors} · <Text style={{ fontFamily: RGF.displayItalic }}>{e.journal}</Text> · {e.year}</Text>
                  <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99, backgroundColor: RGF.bg }}>
                    <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.inkSoft, letterSpacing: 0.4, textTransform: 'uppercase' }}>{e.section || 'discussion'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingHorizontal: 22, paddingBottom: 40 }
});
