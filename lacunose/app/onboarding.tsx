/**
 * Onboarding — real analysis, real streaming, gated reveal.
 *
 * Flow:
 *   Step 0: pick a field + type a topic
 *   Step 1: review / edit the field-specific structured frame (optional)
 *   Step 2: submit a REAL anonymous analysis to the backend, poll for progress
 *   Step 3: reveal the top ranked gap, blur the rest, push to /sign-up
 *
 * The anonymous analysis persists beyond signup: when the user authenticates,
 * AuthProvider calls claimAnonymousIfPending() which re-attaches ownership
 * so the teaser analysis appears in their library.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../constants/theme';
import { Icon, CategoryPill, ScoreDial } from '../components/Shared';
import { FRAMES, QUICK_FIELDS } from '../lib/fields/frames';
import {
  submitAnonymousAnalysis,
  pollAnonymousAnalysis,
  savePendingClaim,
  saveOnboardingTopic,
} from '../lib/onboarding';

// ---------------------------------------------------------------------------
// Shared shell — header dots + footer CTA
// ---------------------------------------------------------------------------
function OnboardShell({
  step,
  total = 4,
  children,
  ctaLabel = 'Next',
  ctaArrow = true,
  ctaDisabled = false,
  skip = true,
  onNext,
}: {
  step: number;
  total?: number;
  children: React.ReactNode;
  ctaLabel?: string;
  ctaArrow?: boolean;
  ctaDisabled?: boolean;
  skip?: boolean;
  onNext: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { RGF, theme } = useTheme();

  return (
    <View style={[styles.shell, { paddingBottom: 28 + insets.bottom, backgroundColor: RGF.bg }]}>
      <View style={styles.header}>
        <View style={styles.dots}>
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === step ? 22 : 6,
                  backgroundColor: i <= step ? RGF.ink : theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(14,14,12,0.15)',
                },
              ]}
            />
          ))}
        </View>
        {skip && (
          <TouchableOpacity onPress={() => router.push('/sign-up')}>
            <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>{children}</View>

      <TouchableOpacity
        activeOpacity={0.8}
        disabled={ctaDisabled}
        onPress={onNext}
        style={[styles.cta, { backgroundColor: RGF.ink, opacity: ctaDisabled ? 0.4 : 1 }]}
      >
        <Text style={[styles.ctaText, { fontFamily: RGF.sansSemiBold, color: RGF.bg }]}>{ctaLabel}</Text>
        {ctaArrow && (
          <View style={[styles.ctaIcon, { backgroundColor: RGF.bg }]}>
            <Icon name="arrow" size={16} color={RGF.ink} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 0: choose a field + type a topic
// ---------------------------------------------------------------------------
function ScreenOnboardA({
  topic,
  setTopic,
  field,
  setField,
  onNext,
}: {
  topic: string;
  setTopic: (t: string) => void;
  field: string;
  setField: (f: string) => void;
  onNext: () => void;
}) {
  const { RGF } = useTheme();
  const activeLabel = FRAMES[field]?.label ?? 'research';
  const canProceed = topic.trim().length >= 3;

  return (
    <OnboardShell step={0} ctaLabel="Continue" ctaDisabled={!canProceed} onNext={onNext}>
      <Text style={[styles.kicker, { fontFamily: RGF.sansSemiBold, color: RGF.muted }]}>
        Step 1 of 4 · Your research topic
      </Text>
      <Text style={[styles.headline, { fontFamily: RGF.display, color: RGF.ink }]}>
        Start with what you{'\n'}
        <Text style={{ fontStyle: 'italic' }}>care about.</Text>
      </Text>
      <Text style={[styles.paragraph, { fontFamily: RGF.sans, color: RGF.inkSoft }]}>
        Pick your field and tell us your research interest. We&rsquo;ll scan thousands of papers and surface the gaps.
      </Text>

      {/* Field chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 22, marginBottom: 18 }}
        style={{ marginHorizontal: -22, paddingHorizontal: 22, flexGrow: 0, maxHeight: 44 }}
      >
        {QUICK_FIELDS.map((id) => {
          const label = FRAMES[id]?.label ?? id;
          const active = field === id;
          return (
            <TouchableOpacity
              key={id}
              onPress={() => setField(id)}
              activeOpacity={0.7}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 99,
                backgroundColor: active ? RGF.ink : RGF.surface,
                borderWidth: 1,
                borderColor: active ? RGF.ink : RGF.hair,
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: active ? RGF.sansMedium : RGF.sans,
                  fontSize: 13,
                  color: active ? RGF.bg : RGF.ink,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View
        style={{
          backgroundColor: RGF.surface,
          borderRadius: 26,
          padding: 20,
          minHeight: 180,
          borderWidth: 1,
          borderColor: RGF.ink,
        }}
      >
        <Text
          style={{
            fontFamily: RGF.sansMedium,
            fontSize: 11,
            color: RGF.muted,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Research interest · {activeLabel}
        </Text>
        <TextInput
          style={{
            flex: 1,
            fontFamily: RGF.sans,
            fontSize: 22,
            lineHeight: 30,
            color: RGF.ink,
            textAlignVertical: 'top',
          }}
          placeholder={`e.g. long-context attention mechanisms in ${activeLabel.toLowerCase()}`}
          placeholderTextColor={RGF.muted}
          multiline
          maxLength={240}
          value={topic}
          onChangeText={setTopic}
          autoFocus
        />
      </View>
    </OnboardShell>
  );
}

// ---------------------------------------------------------------------------
// Step 1: structured frame (optional — leave empty if user doesn't care)
// ---------------------------------------------------------------------------
function FrameRow({
  letter,
  label,
  placeholder,
  value,
  onChange,
  color,
}: {
  letter: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  color: string;
}) {
  const { RGF } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const isEmpty = !value;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setIsEditing(true)}
      style={{
        backgroundColor: RGF.surface,
        borderRadius: 18,
        padding: 12,
        borderWidth: 1,
        borderColor: isEditing ? RGF.ink : RGF.hair,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontFamily: RGF.display, fontSize: 20, color: RGF.ink }}>{letter}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: RGF.sansMedium,
            fontSize: 10,
            color: RGF.muted,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            marginBottom: 1,
          }}
        >
          {label}
        </Text>
        {isEditing ? (
          <TextInput
            autoFocus
            style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.ink, padding: 0 }}
            value={value}
            onChangeText={onChange}
            onBlur={() => setIsEditing(false)}
            placeholder={placeholder}
            placeholderTextColor={RGF.muted}
          />
        ) : (
          <Text
            style={{ fontFamily: RGF.sans, fontSize: 13, color: isEmpty ? RGF.muted : RGF.ink }}
            numberOfLines={1}
          >
            {isEmpty ? placeholder : value}
          </Text>
        )}
      </View>
      {isEditing ? (
        <TouchableOpacity onPress={() => setIsEditing(false)} style={{ padding: 4 }}>
          <Icon name="check" size={16} color={RGF.ink} stroke={2.4} />
        </TouchableOpacity>
      ) : (
        <Icon name="chevR" size={14} color={RGF.muted} />
      )}
    </TouchableOpacity>
  );
}

function ScreenOnboardB({
  field,
  frameValues,
  setFrameValues,
  onNext,
}: {
  field: string;
  frameValues: Record<string, string>;
  setFrameValues: (v: Record<string, string>) => void;
  onNext: () => void;
}) {
  const { RGF } = useTheme();
  const frame = FRAMES[field] ?? FRAMES.generic;
  if (!frame) return null;

  return (
    <OnboardShell step={1} ctaLabel="Find gaps" onNext={onNext}>
      <Text style={[styles.kicker, { fontFamily: RGF.sansSemiBold, color: RGF.muted }]}>
        Step 2 of 4 · Frame the question
      </Text>
      <Text style={[styles.headline, { fontFamily: RGF.display, color: RGF.ink }]}>
        Optionally{'\n'}
        <Text style={{ fontStyle: 'italic' }}>narrow it.</Text>
      </Text>
      <Text style={[styles.paragraph, { fontFamily: RGF.sans, color: RGF.inkSoft, marginBottom: 20 }]}>
        Tap any row to add detail, or skip — our pipeline runs fine without it.
      </Text>

      <View style={{ gap: 10, flex: 1 }}>
        {frame.rows.map((r) => {
          const colorToken = (RGF as unknown as Record<string, string>)[r.color] ?? RGF.lavender;
          return (
            <FrameRow
              key={r.key}
              letter={r.key}
              label={r.label}
              placeholder={r.placeholder}
              value={frameValues[r.key] ?? ''}
              onChange={(v) => setFrameValues({ ...frameValues, [r.key]: v })}
              color={colorToken}
            />
          );
        })}
      </View>
    </OnboardShell>
  );
}

// ---------------------------------------------------------------------------
// Step 2: submit + poll until we see the first gap
// ---------------------------------------------------------------------------
function ScreenOnboardC({
  topic,
  field,
  frameValues,
  onReady,
  onError,
}: {
  topic: string;
  field: string;
  frameValues: Record<string, string>;
  onReady: (firstGap: FirstGap, analysisId: string, claimToken: string) => void;
  onError: (msg: string) => void;
}) {
  const { RGF, theme } = useTheme();
  const [elapsedSec, setElapsedSec] = useState(0);
  const [status, setStatus] = useState<'submitting' | 'queued' | 'running' | 'done' | 'failed'>('submitting');
  const [gapCount, setGapCount] = useState(0);
  const startedAtRef = useRef<number>(Date.now());
  const analysisIdRef = useRef<string | null>(null);
  const claimTokenRef = useRef<string | null>(null);

  // Submit on first render.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const trimmedFrame = Object.fromEntries(
          Object.entries(frameValues).filter(([, v]) => v && v.trim()),
        );
        const res = await submitAnonymousAnalysis({
          topic: topic.trim(),
          field,
          ...(Object.keys(trimmedFrame).length > 0 ? { structured_frame: trimmedFrame } : {}),
        });
        if (cancelled) return;
        analysisIdRef.current = res.id;
        claimTokenRef.current = res.claim_token;
        await savePendingClaim({
          analysis_id: res.id,
          claim_token: res.claim_token,
          claim_expires_at: res.claim_expires_at,
        });
        await saveOnboardingTopic(topic.trim());
        setStatus('queued');
      } catch (e) {
        if (cancelled) return;
        onError((e as Error)?.message ?? 'Could not start analysis');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wall-clock tick.
  useEffect(() => {
    const t = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Poll every 2.5s while running.
  useEffect(() => {
    if (status === 'submitting' || status === 'done' || status === 'failed') return;
    let cancelled = false;
    const poll = async () => {
      const id = analysisIdRef.current;
      const token = claimTokenRef.current;
      if (!id || !token) return;
      try {
        const res = await pollAnonymousAnalysis(id, token);
        if (cancelled) return;
        setGapCount(res.gaps.length);
        setStatus(res.analysis.status);
        if (res.analysis.status === 'failed') {
          onError(res.analysis.error ?? 'Analysis failed — please try a different topic.');
          return;
        }
        // As soon as we have at least one gap, advance.
        if (res.gaps.length > 0) {
          const top = res.gaps[0]!;
          onReady(
            {
              title: top.title,
              category: top.category,
              novelty_score: top.novelty_score ?? 7,
              feasibility_score: top.feasibility_score ?? 7,
            },
            id,
            token,
          );
        }
      } catch (e) {
        // Transient failures — keep polling a few more times.
        console.warn('[onboarding] poll failed', (e as Error)?.message);
      }
    };
    const interval = setInterval(() => void poll(), 2500);
    void poll(); // eager
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status, onError, onReady]);

  // Derive stages for visual progress.
  const stages = [
    { label: 'Queued analysis', done: status !== 'submitting', active: status === 'submitting' },
    {
      label: 'Fetching papers from 5 sources',
      done: status === 'running' || status === 'done' || elapsedSec >= 30,
      active: status === 'queued' || (status === 'running' && elapsedSec < 30),
    },
    {
      label: 'Reading abstracts · extracting signals',
      done: gapCount > 0 || status === 'done',
      active: status === 'running' && gapCount === 0 && elapsedSec >= 30,
    },
    {
      label: gapCount > 0 ? `Synthesizing — ${gapCount} found` : 'Synthesizing gaps',
      done: status === 'done',
      active: status === 'running' && gapCount > 0,
    },
  ];
  const doneCount = stages.filter((s) => s.done).length;
  const pct = Math.min(92, Math.round((elapsedSec / 120) * 100));

  return (
    <OnboardShell step={2} ctaLabel="Analyzing..." ctaArrow={false} ctaDisabled skip={false} onNext={() => {}}>
      <Text style={[styles.kicker, { fontFamily: RGF.sansSemiBold, color: RGF.muted }]}>
        Step 3 of 4 · Live analysis
      </Text>
      <Text style={[styles.headline, { fontFamily: RGF.display, color: RGF.ink }]}>
        Reading everything{'\n'}
        <Text style={{ fontStyle: 'italic' }}>so you don&rsquo;t have to.</Text>
      </Text>

      <View
        style={{
          backgroundColor: RGF.surface,
          borderRadius: 22,
          paddingVertical: 18,
          paddingHorizontal: 20,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: RGF.hair,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 13, color: RGF.ink }}>
            {doneCount} of {stages.length} steps · {elapsedSec}s
          </Text>
          <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>Usually under 90s</Text>
        </View>
        <View style={{ height: 5, borderRadius: 2.5, backgroundColor: RGF.bg, overflow: 'hidden', marginBottom: 16 }}>
          <View style={{ height: '100%', width: `${pct}%`, backgroundColor: RGF.ink, borderRadius: 2.5 }} />
        </View>
        {stages.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
            {s.done ? (
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: RGF.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="check" size={10} color={RGF.bg} stroke={2.4} />
              </View>
            ) : s.active ? (
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  borderWidth: 2,
                  borderColor: RGF.ink,
                  borderTopColor: 'transparent',
                }}
              />
            ) : (
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: RGF.hair }} />
            )}
            <Text
              style={{
                fontFamily: s.active ? RGF.sansMedium : RGF.sans,
                fontSize: 14,
                color: s.done ? RGF.muted : RGF.ink,
              }}
            >
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 18,
        }}
      >
        <Text
          style={{
            fontFamily: RGF.sans,
            fontSize: 13,
            color: RGF.muted,
            textAlign: 'center',
            lineHeight: 20,
          }}
        >
          We&rsquo;re hunting through thousands of papers right now.{'\n'}
          Your first gap will land here in ~{Math.max(5, 90 - elapsedSec)}s.
        </Text>
      </View>
    </OnboardShell>
  );
}

interface FirstGap {
  title: string;
  category: string;
  novelty_score: number;
  feasibility_score: number;
}

// ---------------------------------------------------------------------------
// Step 3: reveal the top gap, blur the rest, CTA to sign-up
// ---------------------------------------------------------------------------
function TeaserGap({
  rank,
  color,
  category,
  novelty,
  visibleTitle,
  hiddenTitle,
  blurRest,
}: {
  rank: number;
  color: string;
  category: string;
  novelty: number;
  visibleTitle: string;
  hiddenTitle: string;
  blurRest?: boolean;
}) {
  const { RGF, theme } = useTheme();
  return (
    <View
      style={{
        backgroundColor: RGF.surface,
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: RGF.hair,
        flexShrink: 0,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontFamily: RGF.display, fontSize: 20, color: RGF.ink }}>{rank}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <CategoryPill kind={category} />
          <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: RGF.display, fontSize: 20, lineHeight: 24, letterSpacing: -0.4, color: RGF.ink }}>
              {visibleTitle}{' '}
            </Text>
            {blurRest ? (
              <View
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(14,14,12,0.9)',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9,
                  shadowRadius: 6,
                  elevation: 2,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontFamily: RGF.display, fontSize: 20, lineHeight: 24, color: 'transparent' }}>
                  {hiddenTitle}
                </Text>
              </View>
            ) : (
              <Text style={{ fontFamily: RGF.display, fontSize: 20, lineHeight: 24, color: RGF.ink }}>
                {hiddenTitle}
              </Text>
            )}
          </View>
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 18,
          paddingTop: 8,
          borderTopWidth: 1,
          borderColor: RGF.hair,
        }}
      >
        <ScoreDial value={novelty} label="Novelty" color={RGF.ink} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.4 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: RGF.hair, borderStyle: 'dashed' }} />
          <Text
            style={{
              fontFamily: RGF.sansMedium,
              fontSize: 11,
              color: RGF.muted,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            Feasibility{'\n'}locked
          </Text>
        </View>
      </View>
    </View>
  );
}

function BlurredStack() {
  const { RGF } = useTheme();
  return (
    <View style={{ gap: 10, opacity: 0.7 }}>
      {[RGF.mint, RGF.butter, RGF.lavender].map((c, i) => (
        <View
          key={i}
          style={{
            backgroundColor: RGF.surface,
            borderRadius: 22,
            padding: 16,
            borderWidth: 1,
            borderColor: RGF.hair,
            flexDirection: 'row',
            gap: 12,
          }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c }} />
          <View style={{ flex: 1 }}>
            <View style={{ height: 8, backgroundColor: RGF.hair, borderRadius: 4, marginBottom: 8, width: '40%' }} />
            <View style={{ height: 14, backgroundColor: RGF.hair, borderRadius: 4, marginBottom: 6, width: '85%' }} />
            <View style={{ height: 14, backgroundColor: RGF.hair, borderRadius: 4, width: '60%' }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ScreenOnboardReveal({ firstGap }: { firstGap: FirstGap | null }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { RGF, theme } = useTheme();

  const grad: [string, string, string] =
    theme === 'dark'
      ? ['rgba(10,10,10,0)', 'rgba(10,10,10,0.7)', 'rgba(10,10,10,1)']
      : ['rgba(241,238,232,0)', 'rgba(241,238,232,0.7)', 'rgba(241,238,232,1)'];

  // Split the first-gap title: show ~60% visibly, blur the rest.
  const title = firstGap?.title ?? 'Your first research gap';
  const words = title.split(/\s+/);
  const pivot = Math.max(1, Math.floor(words.length * 0.55));
  const visibleTitle = words.slice(0, pivot).join(' ');
  const hiddenTitle = words.slice(pivot).join(' ');

  return (
    <View style={[styles.shell, { paddingBottom: 28 + insets.bottom, backgroundColor: RGF.bg }]}>
      <View style={[styles.header, { marginBottom: 18 }]}>
        <View style={styles.dots}>
          {[0, 1, 2, 3].map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === 3 ? 22 : 6,
                  backgroundColor: i <= 3 ? RGF.ink : theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(14,14,12,0.15)',
                },
              ]}
            />
          ))}
        </View>
      </View>
      <Text style={[styles.kicker, { fontFamily: RGF.sansSemiBold, color: RGF.muted }]}>
        Analysis complete · real gap found
      </Text>
      <Text style={[styles.headline, { fontFamily: RGF.display, color: RGF.ink, fontSize: 32, marginBottom: 16 }]}>
        You found a gap{'\n'}
        <Text style={{ fontStyle: 'italic' }}>nobody else has claimed.</Text>
      </Text>

      <TeaserGap
        rank={1}
        color={RGF.sky}
        category={firstGap?.category ?? 'future-work'}
        novelty={firstGap?.novelty_score ?? 7}
        visibleTitle={visibleTitle}
        hiddenTitle={hiddenTitle || '…'}
        blurRest
      />

      <View style={{ flex: 1, position: 'relative', marginTop: 12 }}>
        <BlurredStack />

        <LinearGradient
          colors={grad}
          locations={[0, 0.35, 0.7]}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
        />

        {/* Sign-up gate */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '100%',
            justifyContent: 'flex-end',
            paddingBottom: 8,
          }}
        >
          <View
            style={{
              backgroundColor: RGF.surface,
              borderRadius: 24,
              padding: 18,
              borderWidth: 1,
              borderColor: RGF.hair,
              elevation: 10,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Icon name="lock" size={14} color={RGF.muted} />
              <Text
                style={{
                  fontFamily: RGF.sansSemiBold,
                  fontSize: 11,
                  color: RGF.muted,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                More gaps waiting
              </Text>
            </View>
            <Text
              style={{
                fontFamily: RGF.display,
                fontSize: 22,
                lineHeight: 24,
                letterSpacing: -0.4,
                color: RGF.ink,
                marginBottom: 14,
              }}
            >
              Sign up free to see the full title, novelty scores, and evidence quotes.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/sign-up')}
              style={{
                backgroundColor: RGF.ink,
                borderRadius: 18,
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 15, color: RGF.bg }}>Sign up to reveal</Text>
              <Icon name="arrow" size={16} color={RGF.bg} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------
export default function Onboarding() {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [topic, setTopic] = useState('');
  const [field, setField] = useState<string>('medicine');
  const [frameValues, setFrameValues] = useState<Record<string, string>>({});
  const [firstGap, setFirstGap] = useState<FirstGap | null>(null);

  if (step === 0) {
    return (
      <ScreenOnboardA
        topic={topic}
        setTopic={setTopic}
        field={field}
        setField={setField}
        onNext={() => setStep(1)}
      />
    );
  }
  if (step === 1) {
    return (
      <ScreenOnboardB
        field={field}
        frameValues={frameValues}
        setFrameValues={setFrameValues}
        onNext={() => setStep(2)}
      />
    );
  }
  if (step === 2) {
    return (
      <ScreenOnboardC
        topic={topic}
        field={field}
        frameValues={frameValues}
        onReady={(gap) => {
          setFirstGap(gap);
          setStep(3);
        }}
        onError={(msg) => {
          Alert.alert('Could not run analysis', msg, [
            { text: 'Try different topic', onPress: () => setStep(0) },
            { text: 'Sign up instead', onPress: () => setStep(3) },
          ]);
        }}
      />
    );
  }
  return <ScreenOnboardReveal firstGap={firstGap} />;
}

const styles = StyleSheet.create({
  shell: { flex: 1, paddingTop: 60, paddingHorizontal: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  content: { flex: 1 },
  cta: {
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  ctaText: { fontSize: 16 },
  ctaIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 },
  headline: { fontSize: 36, lineHeight: 37, letterSpacing: -1, marginBottom: 20 },
  paragraph: { fontSize: 14, lineHeight: 21, marginBottom: 24 },
});
