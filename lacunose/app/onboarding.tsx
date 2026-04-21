import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Easing, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { RGF } from '../constants/theme';
import { Icon, CategoryPill, ScoreDial } from '../components/Shared';

// Onboarding scaffold
function OnboardShell({ step, total = 4, children, ctaLabel = 'Next', ctaArrow = true, skip = true, onNext }: any) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.shell, { paddingBottom: 28 + insets.bottom }]}>
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
  const [topic, setTopic] = useState('');
  
  return (
    <OnboardShell step={0} ctaLabel="Analyze topic" onNext={onNext}>
      <Text style={styles.kicker}>Step 1 of 4 · Choose a topic</Text>
      <Text style={styles.headline}>Start with what you{'\n'}<Text style={{ fontStyle: 'italic' }}>care about.</Text></Text>
      <Text style={styles.paragraph}>Enter your exact research interest. We'll pull every paper in the last 5 years and hunt for what's missing.</Text>
      
      <View style={{
        backgroundColor: '#fff', borderRadius: 26, padding: 20, minHeight: 180,
        borderWidth: 1, borderColor: RGF.ink,
      }}>
        <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
          Research interest
        </Text>
        <TextInput 
          style={{ flex: 1, fontFamily: RGF.sans, fontSize: 24, lineHeight: 32, color: RGF.ink, textAlignVertical: 'top' }}
          placeholder="e.g. Impact of GLP-1 agonists on pediatric obesity..."
          placeholderTextColor="#C4C6CC"
          multiline
          autoFocus
          value={topic}
          onChangeText={setTopic}
        />
      </View>
    </OnboardShell>
  );
}

function PicoRow({ letter, label, initialValue, color }: any) {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={() => setIsEditing(true)}
      style={{
        backgroundColor: '#fff', borderRadius: 18, padding: 12,
        borderWidth: 1, borderColor: isEditing ? RGF.ink : RGF.hair,
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
        {isEditing ? (
          <TextInput 
            autoFocus 
            style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.ink, padding: 0 }} 
            value={value} 
            onChangeText={setValue}
            onBlur={() => setIsEditing(false)}
          />
        ) : (
          <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.ink }} numberOfLines={1}>{value}</Text>
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

function ScreenOnboardB({ onNext }: { onNext: () => void }) {
  return (
    <OnboardShell step={1} ctaLabel="Run analysis" onNext={onNext}>
      <Text style={styles.kicker}>Step 2 of 4 · Frame the question</Text>
      <Text style={styles.headline}>Tell us the{'\n'}<Text style={{ fontStyle: 'italic' }}>PICO.</Text></Text>
      <Text style={[styles.paragraph, { marginBottom: 20 }]}>Population, Intervention, Comparator, Outcome. Edit if needed.</Text>

      <View style={{ gap: 10, flex: 1 }}>
        <PicoRow letter="P" label="Population" initialValue="Children 6–17 with BMI ≥ 95th percentile" color={RGF.rose}/>
        <PicoRow letter="I" label="Intervention" initialValue="Semaglutide 2.4mg weekly" color={RGF.lavender}/>
        <PicoRow letter="C" label="Comparator" initialValue="Lifestyle only" color={RGF.mint}/>
        <PicoRow letter="O" label="Outcome" initialValue="Cardiometabolic events at 24 mo" color={RGF.sky}/>
      </View>

      <View style={{ backgroundColor: '#fff', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: RGF.hair, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <Icon name="sparkle" size={16} color={RGF.ink} />
        <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.inkSoft, flex: 1 }}>We auto-filled this from your topic. Tap any row to edit.</Text>
      </View>
    </OnboardShell>
  );
}

function ScreenOnboardC({ onNext }: { onNext: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onNext();
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const steps = [
    { label: 'Fetched 512 papers', done: true },
    { label: 'Parsed 187 full texts', done: true },
    { label: 'Clustered into 6 sub-topics', done: true },
    { label: 'Synthesizing gaps…', active: true },
  ];

  return (
    <OnboardShell step={2} ctaLabel="Analyzing..." ctaArrow={false} onNext={() => {}}>
      <Text style={styles.kicker}>Step 3 of 4 · Synthesis in progress</Text>
      <Text style={styles.headline}>Reading everything{'\n'}<Text style={{ fontStyle: 'italic' }}>so you don't have to.</Text></Text>

      <View style={{ backgroundColor: '#fff', borderRadius: 22, paddingVertical: 18, paddingHorizontal: 20, marginBottom: 24, borderWidth: 1, borderColor: RGF.hair, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 13, color: RGF.ink }}>3 of 4 steps</Text>
          <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>~20s remaining</Text>
        </View>
        <View style={{ height: 5, borderRadius: 2.5, backgroundColor: RGF.bg, overflow: 'hidden', marginBottom: 16 }}>
          <View style={{ height: '100%', width: '75%', backgroundColor: RGF.ink, borderRadius: 2.5 }} />
        </View>
        {steps.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
            {s.done ? (
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: RGF.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={10} color="#fff" stroke={2.4} />
              </View>
            ) : s.active ? (
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: RGF.ink, borderTopColor: 'transparent' }} />
            ) : (
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: RGF.hair }} />
            )}
            <Text style={{ fontFamily: s.active ? RGF.sansMedium : RGF.sans, fontSize: 14, color: s.done ? RGF.muted : RGF.ink }}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>Uncovering insights</Text>
        <TeaserGap rank={1} color={RGF.sky} category="future-work" novelty={9} visibleTitle="Long-term cardiometabolic" hiddenTitle="safety under age 12" />
        <View style={{ marginTop: 12 }}>
          <BlurredStack />
        </View>
        <BlurView intensity={70} tint="light" style={{ position: 'absolute', top: 0, left: -20, right: -20, bottom: -20 }} />
      </View>
    </OnboardShell>
  );
}

function TeaserGap({ rank, color, category, novelty, visibleTitle, hiddenTitle, blurRest }: any) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: RGF.hair, flexShrink: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: RGF.display, fontSize: 20, color: RGF.ink }}>{rank}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <CategoryPill kind={category} />
          <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: RGF.display, fontSize: 20, lineHeight: 24, letterSpacing: -0.4, color: RGF.ink }}>
              {visibleTitle}{' '}
            </Text>
            {blurRest ? (
              <View style={{ 
                backgroundColor: 'rgba(14,14,12,0.9)', 
                borderRadius: 6, paddingHorizontal: 8, 
                shadowColor: '#0E0E0C', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6, elevation: 2,
                justifyContent: 'center', alignItems: 'center'
              }}>
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

function BlurredStack() {
  return (
    <View style={{ gap: 10, opacity: 0.7 }}>
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

function ScreenOnboardReveal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.shell, { paddingBottom: 28 + insets.bottom }]}>
      <View style={[styles.header, { marginBottom: 18 }]}>
        <View style={styles.dots}>
          {[0, 1, 2, 3].map((_, i) => (
            <View key={i} style={[styles.dot, { width: i === 3 ? 22 : 6, backgroundColor: i <= 3 ? RGF.ink : 'rgba(14,14,12,0.15)' }]} />
          ))}
        </View>
      </View>
      <Text style={styles.kicker}>Analysis complete · 8 gaps found</Text>
      <Text style={[styles.headline, { fontSize: 32, marginBottom: 16 }]}>You found a gap{'\n'}<Text style={{ fontStyle: 'italic' }}>nobody else has claimed.</Text></Text>

      <TeaserGap rank={1} color={RGF.sky} category="future-work" novelty={9} visibleTitle="Long-term cardiometabolic" hiddenTitle="safety under age 12" blurRest />

      <View style={{ flex: 1, position: 'relative', marginTop: 12 }}>
        <BlurredStack />
        <BlurView intensity={70} tint="light" style={{ position: 'absolute', top: 0, bottom: 0, left: -20, right: -20 }} />

        {/* Sign-up gate overlay */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', justifyContent: 'flex-end', paddingBottom: 8 }}>
          
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 18, borderWidth: 1, borderColor: RGF.hair, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Icon name="lock" size={14} color={RGF.muted} />
              <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                7 more gaps waiting
              </Text>
            </View>
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
