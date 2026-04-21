import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { RGF } from '../constants/theme';
import { Icon, CategoryPill, ScoreDial } from '../components/Shared';

// Onboarding scaffold
function OnboardShell({ step, total = 4, children, ctaLabel = 'Next', ctaArrow = true, skip = true, onNext }: any) {
  const router = useRouter();
  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View style={styles.dots}>
          {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={[
              styles.dot,
              { width: i === step ? 22 : 6, backgroundColor: i <= step ? RGF.ink : 'rgba(14,14,12,0.15)' }
            ]} />
          ))}
        </View>
        {skip && (
          <TouchableOpacity onPress={() => router.push('/sign-up')}>
            <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        {children}
      </View>

      <TouchableOpacity activeOpacity={0.8} onPress={onNext} style={styles.cta}>
        <Text style={styles.ctaText}>{ctaLabel}</Text>
        {ctaArrow && (
          <View style={styles.ctaIcon}>
            <Icon name="arrow" size={16} color={RGF.ink} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

function ScreenOnboardA({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState(0);
  const suggestions = [
    { t: 'GLP-1 in pediatric obesity', c: RGF.sky },
    { t: 'CAR-T in solid tumors', c: RGF.mint },
    { t: 'Microbiome & colorectal ca.', c: RGF.butter },
    { t: 'ML for sepsis triage', c: RGF.peach },
  ];
  return (
    <OnboardShell step={0} ctaLabel="Use this topic" onNext={onNext}>
      <Text style={styles.kicker}>Step 1 of 4 · Choose a topic</Text>
      <Text style={styles.headline}>Start with what you{'\n'}<Text style={{ fontStyle: 'italic' }}>care about.</Text></Text>
      <Text style={styles.paragraph}>Pick a seed topic. We'll pull every paper in the last 5 years and hunt for what's missing.</Text>
      
      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
        {suggestions.map((s, i) => (
          <TouchableOpacity 
            key={i} activeOpacity={0.7} onPress={() => setSelected(i)}
            style={{
              backgroundColor: selected === i ? s.c : '#fff',
              borderRadius: 20, padding: 16,
              borderWidth: selected === i ? 2 : 1,
              borderColor: selected === i ? RGF.ink : RGF.hair,
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: selected === i ? '#fff' : s.c,
              alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="gap" size={16} color={RGF.ink} />
            </View>
            <Text style={{ flex: 1, fontFamily: RGF.sansMedium, fontSize: 14, color: RGF.ink }}>{s.t}</Text>
            {selected === i && (
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: RGF.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={12} color="#fff" stroke={2.4} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </OnboardShell>
  );
}

function PicoRow({ letter, label, value, color }: any) {
  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 18, padding: 12,
      borderWidth: 1, borderColor: RGF.hair,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: 12, backgroundColor: color,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontFamily: RGF.display, fontSize: 20, color: RGF.ink }}>{letter}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 1 }}>{label}</Text>
        <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.ink }} numberOfLines={1}>{value}</Text>
      </View>
      <Icon name="chevR" size={14} color={RGF.muted} />
    </View>
  );
}

function ScreenOnboardB({ onNext }: { onNext: () => void }) {
  return (
    <OnboardShell step={1} ctaLabel="Run analysis" onNext={onNext}>
      <Text style={styles.kicker}>Step 2 of 4 · Frame the question</Text>
      <Text style={styles.headline}>Tell us the{'\n'}<Text style={{ fontStyle: 'italic' }}>PICO.</Text></Text>
      <Text style={[styles.paragraph, { marginBottom: 20 }]}>Population, Intervention, Comparator, Outcome. It's okay to leave some blank.</Text>

      <View style={{ gap: 10, flex: 1 }}>
        <PicoRow letter="P" label="Population" value="Children 6–17 with BMI ≥ 95th percentile" color={RGF.rose}/>
        <PicoRow letter="I" label="Intervention" value="Semaglutide 2.4mg weekly" color={RGF.lavender}/>
        <PicoRow letter="C" label="Comparator" value="Lifestyle only" color={RGF.mint}/>
        <PicoRow letter="O" label="Outcome" value="Cardiometabolic events at 24 mo" color={RGF.sky}/>
      </View>

      <View style={{ backgroundColor: '#fff', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: RGF.hair, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <Icon name="sparkle" size={16} color={RGF.ink} />
        <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.inkSoft, flex: 1 }}>We auto-filled this from your topic. Tap to edit.</Text>
      </View>
    </OnboardShell>
  );
}

function ScreenOnboardC({ onNext }: { onNext: () => void }) {
  const spinAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
    ).start();
    
    // Auto advance after 3 seconds for simulation
    const timer = setTimeout(() => {
      onNext();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <OnboardShell step={2} ctaLabel="Analyzing..." ctaArrow={false} onNext={() => {}}>
      <Text style={styles.kicker}>Step 3 of 4 · Synthesis in progress</Text>
      <Text style={styles.headline}>Reading everything{'\n'}<Text style={{ fontStyle: 'italic' }}>so you don't have to.</Text></Text>

      <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: RGF.hair, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <Animated.View style={{
            width: 48, height: 48, borderRadius: 24,
            borderWidth: 3, borderColor: RGF.hair, borderTopColor: RGF.ink,
            transform: [{ rotate: spin }]
          }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 13, color: RGF.ink }}>Clustering sub-topics</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 11, color: RGF.muted }}>187 of 512 papers processed</Text>
          </View>
          <Text style={{ fontFamily: RGF.display, fontSize: 28, color: RGF.ink, letterSpacing: -0.5 }}>37%</Text>
        </View>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: RGF.hair, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: '37%', backgroundColor: RGF.ink, borderRadius: 2 }} />
        </View>
      </View>

      <View style={{ backgroundColor: RGF.ink, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, flex: 1, overflow: 'hidden' }}>
        <Text style={{ fontFamily: RGF.mono, fontSize: 11, lineHeight: 18, color: '#9FA8B8' }}>{`> Fetching PubMed + Cochrane…`}</Text>
        <Text style={{ fontFamily: RGF.mono, fontSize: 11, lineHeight: 18, color: '#9FA8B8' }}>{`> Retrieved `}<Text style={{color: RGF.butter}}>512</Text> abstracts</Text>
        <Text style={{ fontFamily: RGF.mono, fontSize: 11, lineHeight: 18, color: '#9FA8B8' }}>{`> Parsing full texts…`}</Text>
        <Text style={{ fontFamily: RGF.mono, fontSize: 11, lineHeight: 18, color: '#9FA8B8' }}>{`> `}<Text style={{color: RGF.mint}}>187/512</Text> parsed</Text>
        <Text style={{ fontFamily: RGF.mono, fontSize: 11, lineHeight: 18, color: '#9FA8B8' }}>{`> Building embedding graph…`}</Text>
        <Text style={{ fontFamily: RGF.mono, fontSize: 11, lineHeight: 18, color: '#fff' }}>{`> Clustering `}<Text style={{color: RGF.sky}}>sub-topics</Text> ▌</Text>
      </View>
    </OnboardShell>
  );
}

function BlurredStack() {
  return (
    <View style={{ gap: 10, opacity: 0.6 }}>
      {[RGF.mint, RGF.butter, RGF.lavender].map((c, i) => (
        <View key={i} style={{ backgroundColor: '#fff', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: RGF.hair, flexDirection: 'row', gap: 12 }}>
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

function TeaserGap({ rank, color, category, novelty, visibleTitle, hiddenTitle }: any) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: RGF.hair, flexShrink: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: RGF.display, fontSize: 20, color: RGF.ink }}>{rank}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <CategoryPill kind={category} />
          <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: RGF.display, fontSize: 20, lineHeight: 23, letterSpacing: -0.4, color: RGF.ink }}>
              {visibleTitle}{' '}
            </Text>
            <View style={{ backgroundColor: 'rgba(14,14,12,0.95)', borderRadius: 6, paddingHorizontal: 8 }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 20, lineHeight: 23, color: 'rgba(14,14,12,0)', opacity: 0.1 }}>
                {hiddenTitle}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, paddingTop: 8, borderTopWidth: 1, borderColor: RGF.hair }}>
        <ScoreDial value={novelty} label="Novelty" color={RGF.ink} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.4 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: RGF.hair, borderStyle: 'dashed' }} />
          <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 0.3, textTransform: 'uppercase' }}>Feasibility{'\n'}locked</Text>
        </View>
      </View>
    </View>
  );
}

function ScreenOnboardReveal() {
  const router = useRouter();
  return (
    <View style={styles.shell}>
      <View style={[styles.header, { marginBottom: 18 }]}>
        <View style={styles.dots}>
          {[0, 1, 2, 3].map((_, i) => (
            <View key={i} style={[styles.dot, { width: i === 3 ? 22 : 6, backgroundColor: i <= 3 ? RGF.ink : 'rgba(14,14,12,0.15)' }]} />
          ))}
        </View>
      </View>
      <Text style={styles.kicker}>Analysis complete · 8 gaps found</Text>
      <Text style={[styles.headline, { fontSize: 32, marginBottom: 16 }]}>You found a gap{'\n'}<Text style={{ fontStyle: 'italic' }}>nobody else has claimed.</Text></Text>

      <TeaserGap rank={1} color={RGF.sky} category="future-work" novelty={9} visibleTitle="Long-term cardiometabolic" hiddenTitle="safety under age 12" />

      <View style={{ flex: 1, position: 'relative', marginTop: 12 }}>
        <BlurredStack />

        {/* Sign-up gate overlay */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '110%', justifyContent: 'flex-end', padding: 4 }}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', backgroundColor: 'rgba(241,238,232,0.85)' }} />
          
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: RGF.hair, elevation: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }}>
            <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
              🔒 7 more gaps waiting
            </Text>
            <Text style={{ fontFamily: RGF.display, fontSize: 22, lineHeight: 24, letterSpacing: -0.4, color: RGF.ink, marginBottom: 14 }}>
              Sign up free to see full titles, novelty scores and evidence quotes.
            </Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push('/sign-up')}
              style={{ backgroundColor: RGF.ink, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 15, color: '#fff' }}>Sign up to reveal</Text>
              <Icon name="arrow" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);

  if (step === 0) return <ScreenOnboardA onNext={() => setStep(1)} />;
  if (step === 1) return <ScreenOnboardB onNext={() => setStep(2)} />;
  if (step === 2) return <ScreenOnboardC onNext={() => setStep(3)} />;
  return <ScreenOnboardReveal />;
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: RGF.bg,
    paddingTop: 60,
    paddingHorizontal: 22,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
  cta: {
    backgroundColor: RGF.ink,
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  ctaText: {
    fontFamily: RGF.sansSemiBold,
    color: '#fff',
    fontSize: 16,
  },
  ctaIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center'
  },
  kicker: {
    fontFamily: RGF.sansSemiBold, fontSize: 11, color: RGF.muted, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10
  },
  headline: {
    fontFamily: RGF.display, fontSize: 36, lineHeight: 37, letterSpacing: -1, color: RGF.ink, marginBottom: 20
  },
  paragraph: {
    fontFamily: RGF.sans, fontSize: 14, color: RGF.inkSoft, lineHeight: 21, marginBottom: 24
  }
});
