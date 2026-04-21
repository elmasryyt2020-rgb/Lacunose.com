import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../constants/theme';
import { ChipIcon, Icon, CategoryPill, ScoreDial } from '../../components/Shared';
import { useAnalysis } from '../../hooks/useAnalyses';
import { useGapStream } from '../../hooks/useGapStream';
import { FRAMES } from '../../lib/fields/frames';

function StreamStatus() {
  const { RGF } = useTheme();
  const steps = [
    { label: 'Fetched 512 papers', done: true },
    { label: 'Parsed 187 full texts', done: true },
    { label: 'Clustered into 6 sub-topics', done: true },
    { label: 'Synthesizing gaps…', active: true },
  ];
  return (
    <View style={{ backgroundColor: RGF.surface, borderRadius: 22, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 20, borderWidth: 1, borderColor: RGF.hair }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 13, color: RGF.ink }}>3 of 4 steps</Text>
        <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>~20s remaining</Text>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: RGF.bg, overflow: 'hidden', marginBottom: 14 }}>
        <View style={{ height: '100%', width: '75%', backgroundColor: RGF.ink, borderRadius: 2 }} />
      </View>
      {steps.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
          {s.done ? (
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: RGF.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={10} color={RGF.bg} stroke={2.4} />
            </View>
          ) : s.active ? (
            <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: RGF.ink, borderTopColor: 'transparent' }} />
          ) : (
            <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: RGF.hair }} />
          )}
          <Text style={{ fontFamily: s.active ? RGF.sansMedium : RGF.sans, fontSize: 13, color: s.done ? RGF.muted : RGF.ink }}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

function GapCard({ rank, color, category, novelty, feas, title, desc, evidence = [], collapsed, onPress }: any) {
  const { RGF } = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{ backgroundColor: RGF.surface, borderRadius: 26, padding: 18, borderWidth: 1, borderColor: RGF.hair }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: color, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Text style={{ fontFamily: RGF.display, fontSize: 20, color: RGF.ink }}>{String(rank).padStart(2, '0')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <CategoryPill kind={category} />
          <Text style={{ fontFamily: RGF.display, fontSize: 20, lineHeight: 23, letterSpacing: -0.4, color: RGF.ink, marginTop: 8 }}>{title}</Text>
        </View>
      </View>

      <Text style={{ fontFamily: RGF.sans, fontSize: 13.5, lineHeight: 20, color: RGF.inkSoft, marginBottom: 14 }}>{desc}</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: collapsed ? 0 : 14 }}>
        <ScoreDial value={novelty} label="Novelty" color={RGF.ink} />
        <ScoreDial value={feas} label="Feasibility" color={RGF.ink} />
      </View>

      {!collapsed && evidence.length > 0 && (
        <View style={{ backgroundColor: RGF.bg, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>Evidence · {evidence.length} papers</Text>
            <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>Verified ✓</Text>
          </View>
          {evidence.map((e: any, i: number) => (
            <View key={i} style={{ paddingVertical: 8, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: RGF.hair }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 14, lineHeight: 20, color: RGF.ink, fontStyle: 'italic', marginBottom: 4 }}>"{e.quote}"</Text>
              <Text style={{ fontFamily: RGF.sans, fontSize: 11, color: RGF.muted }}>{e.authors} · {e.year}</Text>
            </View>
          ))}
        </View>
      )}

      {collapsed && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
          <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>3 papers · verified</Text>
          <Icon name="chevD" size={16} color={RGF.muted} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function GapCardPending({ rank }: { rank: number }) {
  const { RGF } = useTheme();
  return (
    <View style={{ backgroundColor: RGF.surface, borderRadius: 26, padding: 18, borderWidth: 1, borderColor: RGF.hair, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.7 }}>
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: RGF.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: RGF.display, fontSize: 20, color: RGF.muted }}>{rank}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: RGF.hair, marginBottom: 8, width: '70%' }} />
        <View style={{ height: 8, borderRadius: 4, backgroundColor: RGF.hair, width: '50%' }} />
      </View>
      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: RGF.ink, borderTopColor: 'transparent' }} />
    </View>
  );
}

export default function ScreenResults() {
  const router = useRouter();
  const { RGF } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const { data: analysis, isLoading } = useAnalysis(id || '');
  const stream = useGapStream(id || '');
  
  const dbGaps = analysis?.gap_items || [];
  const dbGapIds = new Set(dbGaps.map((g: any) => g.id));
  const newGaps = stream.filter((g: any) => !dbGapIds.has(g.id));
  const allGaps = [...dbGaps, ...newGaps].sort((a: any, b: any) => a.rank - b.rank);
  const isPending = analysis?.status !== 'done';

  return (
    <View style={[styles.container, { backgroundColor: RGF.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChipIcon name="chevL" size={40} iconSize={14} bg={RGF.surface} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ChipIcon name="share" size={40} iconSize={16} bg={RGF.surface} />
            <ChipIcon name="download" size={40} iconSize={16} bg={RGF.surface} />
          </View>
        </View>

        <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
          Analysis · {FRAMES[analysis?.field]?.label || analysis?.field || 'Loading'}
        </Text>
        <Text style={{ fontFamily: RGF.display, fontSize: 32, lineHeight: 34, letterSpacing: -0.9, color: RGF.ink, marginBottom: 18 }}>
          {analysis?.topic || 'Loading...'}
        </Text>

        {isPending && <StreamStatus />}

        <View style={{ gap: 12 }}>
          {allGaps.map((g: any) => {
            const frameColor = (RGF as any)[FRAMES[analysis?.field]?.rows[0]?.color || 'lavender'];
            return (
              <GapCard
                key={g.id}
                rank={g.rank}
                color={frameColor}
                category={g.category}
                novelty={g.novelty_score}
                feas={g.feasibility_score}
                title={g.title}
                desc={g.description}
                evidence={g.evidence || []}
                onPress={() => router.push(`/analyze/detail?gapId=${g.id}`)}
              />
            );
          })}
          {isPending && <GapCardPending rank={allGaps.length + 1} />}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingHorizontal: 22, paddingBottom: 40 }
});
