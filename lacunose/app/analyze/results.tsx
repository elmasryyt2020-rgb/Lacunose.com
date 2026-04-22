import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../constants/theme';
import { ChipIcon, Icon, CategoryPill, ScoreDial } from '../../components/Shared';
import { useAnalysis } from '../../hooks/useAnalyses';
import { useGapStream } from '../../hooks/useGapStream';
import { FRAMES } from '../../lib/fields/frames';

/**
 * Maps the `gap_analyses.status` + live gap count to the user-facing pipeline
 * stages. The backend only emits a handful of statuses (queued/running/done/
 * failed), but the user wants to see meaningful progress — so we infer stage
 * from (status, gapsSoFar, elapsedMs).
 */
function StreamStatus({ status, gapsSoFar, startedAt }: { status: string; gapsSoFar: number; startedAt: string | null | undefined }) {
  const { RGF } = useTheme();

  // Tick every 1s so "elapsed" updates live.
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Rotating spinner — real animation, not a static CSS ring.
  const spinValue = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [spinValue]);
  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const elapsedSec = startedAt ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000)) : 0;

  // Progressive stage unlock — each stage has a minimum time it must be
  // "active" (animating) before we advance. This prevents stages from
  // instantly flipping done when the screen opens mid-analysis or when
  // the backend is fast.
  //
  // We use a ref to track the "current" stageIndex inside effects so we
  // never capture a stale closure value.
  const STAGE_MIN_MS = [800, 2500, 2500, 0]; // min active time per stage

  const getDesiredStage = React.useCallback(
    (current: number) => {
      if (status === 'done' || status === 'failed') return 4;
      if (gapsSoFar > 0 && current < 3) return 3;
      if (status === 'running' && current < 1) return 1;
      return current;
    },
    [status, gapsSoFar],
  );

  const [stageIndex, setStageIndex] = React.useState(() => {
    // Seed with the "real" stage inferred from current data so we don't
    // always start at 0 when the user opens a mid-flight analysis.
    if (status === 'done' || status === 'failed') return 4;
    if (gapsSoFar > 0) return 3;
    if (status === 'running') return 1;
    return 0;
  });
  const stageIndexRef = React.useRef(stageIndex);
  stageIndexRef.current = stageIndex;

  // Advance stageIndex when backend signals progress, but only after the
  // minimum display time for the current stage. Steps one stage at a time
  // so every spinner is visible before becoming a checkmark.
  React.useEffect(() => {
    const desired = getDesiredStage(stageIndexRef.current);
    if (desired <= stageIndexRef.current) return;

    const delay = STAGE_MIN_MS[stageIndexRef.current] ?? 0;
    const t = setTimeout(() => {
      setStageIndex((prev) => {
        const next = Math.min(prev + 1, desired);
        return next;
      });
    }, delay);
    return () => clearTimeout(t);
  }, [status, gapsSoFar, stageIndex, getDesiredStage]);

  type Stage = { label: string; done: boolean; active: boolean };
  const stages: Stage[] = [
    {
      label: 'Queued analysis',
      done: stageIndex > 0,
      active: stageIndex === 0,
    },
    {
      label: 'Fetching papers from 5 sources',
      done: stageIndex > 1,
      active: stageIndex === 1,
    },
    {
      label: 'Reading abstracts + extracting signals',
      done: stageIndex > 2,
      active: stageIndex === 2,
    },
    {
      label: gapsSoFar > 0 ? `Synthesizing gaps — ${gapsSoFar} found` : 'Synthesizing gaps',
      done: stageIndex > 3,
      active: stageIndex === 3,
    },
  ];
  const doneCount = stages.filter((s) => s.done).length;

  // ETA: most analyses run 60-180s. We show a decaying estimate so it doesn't
  // stick at "30s remaining" forever.
  const totalEstimate = 180;
  const remaining = Math.max(5, totalEstimate - elapsedSec);
  const pct = Math.min(95, Math.round((elapsedSec / totalEstimate) * 100));

  if (status === 'failed') {
    return (
      <View style={{ backgroundColor: RGF.surface, borderRadius: 22, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 20, borderWidth: 1, borderColor: RGF.rose ?? RGF.hair }}>
        <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 14, color: RGF.ink, marginBottom: 4 }}>Analysis failed</Text>
        <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>Please try again. If this persists, contact support.</Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: RGF.surface, borderRadius: 22, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 20, borderWidth: 1, borderColor: RGF.hair }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 13, color: RGF.ink }}>
          {doneCount} of {stages.length} steps · {elapsedSec}s
        </Text>
        <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>
          ~{remaining}s remaining
        </Text>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: RGF.bg, overflow: 'hidden', marginBottom: 14 }}>
        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: RGF.ink, borderRadius: 2 }} />
      </View>
      {stages.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
          {s.done ? (
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: RGF.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={10} color={RGF.bg} stroke={2.4} />
            </View>
          ) : s.active ? (
            <Animated.View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: RGF.ink, borderTopColor: 'transparent', transform: [{ rotate: spin }] }} />
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
  const { RGF, displayShadow } = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{ backgroundColor: RGF.surface, borderRadius: 26, padding: 18, borderWidth: 1, borderColor: RGF.hair }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: color, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Text style={{ fontFamily: RGF.display, fontSize: 20, color: RGF.ink }}>{String(rank).padStart(2, '0')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <CategoryPill kind={category} bg={color} />
          <Text style={{ fontFamily: RGF.display, fontSize: 20, lineHeight: 23, letterSpacing: -0.4, color: RGF.ink, marginTop: 8, ...displayShadow }}>{title}</Text>
        </View>
      </View>

      <Text style={{ fontFamily: RGF.sans, fontSize: 13.5, lineHeight: 20, color: RGF.inkSoft, marginBottom: 14 }}>{desc}</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: collapsed ? 0 : 14 }}>
        <ScoreDial value={novelty} label="Novelty" color={RGF.sky} />
        <ScoreDial value={feas} label="Feasibility" color={RGF.mint} />
      </View>

      {!collapsed && evidence.length > 0 && (
        <View style={{ backgroundColor: RGF.bg, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>Evidence · {evidence.length} papers</Text>
            <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>Verified ✓</Text>
          </View>
          {evidence.map((e: any, i: number) => (
            <View key={i} style={{ paddingVertical: 8, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: RGF.hair }}>
              <Text style={{ fontFamily: RGF.displayItalic, fontSize: 14, lineHeight: 20, color: RGF.ink, marginBottom: 4 }}>"{e.quote}"</Text>
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
  const spinValue = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [spinValue]);
  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={{ backgroundColor: RGF.surface, borderRadius: 26, padding: 18, borderWidth: 1, borderColor: RGF.hair, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.7 }}>
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: RGF.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: RGF.display, fontSize: 20, color: RGF.muted }}>{rank}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: RGF.hair, marginBottom: 8, width: '70%' }} />
        <View style={{ height: 8, borderRadius: 4, backgroundColor: RGF.hair, width: '50%' }} />
      </View>
      <Animated.View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: RGF.ink, borderTopColor: 'transparent', transform: [{ rotate: spin }] }} />
    </View>
  );
}

export default function ScreenResults() {
  const router = useRouter();
  const { RGF, displayShadow } = useTheme();
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
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChipIcon name="chevL" size={40} iconSize={14} bg={RGF.surface} />
          </TouchableOpacity>
        </View>

        <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
          Analysis · {FRAMES[analysis?.field]?.label || analysis?.field || 'Loading'}
        </Text>
        <Text style={{ fontFamily: RGF.display, fontSize: 32, lineHeight: 34, letterSpacing: -0.9, color: RGF.ink, marginBottom: 18, ...displayShadow }}>
          {analysis?.topic || 'Loading...'}
        </Text>

        {isPending && (
          <StreamStatus
            status={analysis?.status ?? 'queued'}
            gapsSoFar={allGaps.length}
            startedAt={analysis?.created_at}
          />
        )}

        <View style={{ gap: 12 }}>
          {allGaps.map((g: any, idx: number) => {
            const CARD_COLORS: Array<keyof typeof RGF> = ['lavender', 'mint', 'sky', 'butter', 'peach', 'rose', 'sage'];
            const colorKey = CARD_COLORS[idx % CARD_COLORS.length];
            const frameColor = (RGF as any)[colorKey];
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
