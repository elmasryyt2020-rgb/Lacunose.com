import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../constants/theme';
import { ChipIcon, CategoryPill } from '../../components/Shared';

function ScoreBig({ value, label, color }: any) {
  const { RGF } = useTheme();
  return (
    <View style={{
      flex: 1, backgroundColor: color, borderRadius: 20,
      paddingVertical: 14, paddingHorizontal: 12, aspectRatio: 1 / 1.05,
      justifyContent: 'space-between',
    }}>
      <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.inkSoft, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ fontFamily: RGF.display, fontSize: 48, lineHeight: 48, color: RGF.ink, letterSpacing: -1.5 }}>
        {value}<Text style={{ fontSize: 18, color: RGF.muted }}>/10</Text>
      </Text>
    </View>
  );
}

export default function ScreenDetail() {
  const router = useRouter();
  const { RGF } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: RGF.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChipIcon name="chevL" size={40} iconSize={14} bg={RGF.surface} />
          </TouchableOpacity>
          <ChipIcon name="bookmark" size={40} iconSize={16} bg={RGF.surface} />
        </View>

        <View style={{ marginBottom: 18 }}>
          <CategoryPill kind="future-work" />
        </View>

        <Text style={{ fontFamily: RGF.display, fontSize: 30, lineHeight: 32, letterSpacing: -0.8, color: RGF.ink, marginBottom: 20 }}>
          Long-term{'\n'}cardiometabolic{'\n'}safety in children{'\n'}<Text style={{ fontStyle: 'italic' }}>under twelve.</Text>
        </Text>

        {/* scores */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 22 }}>
          <ScoreBig value={9} label="Novelty" color={RGF.sky} />
          <ScoreBig value={7} label="Feasibility" color={RGF.mint} />
          <ScoreBig value={6} label="Evidence" color={RGF.butter} />
        </View>

        {/* research question */}
        <View style={{ backgroundColor: RGF.ink, borderRadius: 24, padding: 20, marginBottom: 14 }}>
          <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: RGF.bg, opacity: 0.5, marginBottom: 10 }}>
            Suggested research question
          </Text>
          <Text style={{ fontFamily: RGF.display, fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: RGF.bg }}>
            In children aged 6–11 with BMI ≥ 95th percentile, does 24-month semaglutide use alter lipid profile or HRV compared to lifestyle-only?
          </Text>
        </View>

        {/* method rec */}
        <View style={{ backgroundColor: RGF.surface, borderRadius: 24, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: RGF.hair }}>
          <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: RGF.muted, marginBottom: 8 }}>
            Suggested method
          </Text>
          <Text style={{ fontFamily: RGF.sans, fontSize: 15, color: RGF.ink, lineHeight: 22, marginBottom: 10 }}>
            Multi-center <Text style={{ fontFamily: RGF.sansSemiBold }}>prospective cohort</Text> with 24-month follow-up.
          </Text>
          <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>Est. N ≈ 180</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>·</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>3 sites</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>·</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>18–24 mo</Text>
          </View>
        </View>

        {/* evidence panel */}
        <View style={{ backgroundColor: RGF.surface, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: RGF.hair }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontFamily: RGF.display, fontSize: 20, color: RGF.ink, letterSpacing: -0.3 }}>Evidence</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>5 papers</Text>
          </View>
          {[
            { q: '…future studies should examine outcomes beyond 2 years in pre-adolescent populations, particularly cardiovascular endpoints…', a: 'Nelson, Chen, O\'Brien', y: 2024, j: 'NEJM', s: 'discussion' },
            { q: '…long-term cardiovascular safety data in children under 12 remain unavailable…', a: 'Park, Rivera, Kaur', y: 2025, j: 'Lancet Child Adol.', s: 'limitations' },
            { q: '…trials to date have not been powered to detect cardiometabolic events in this age group…', a: 'Otieno et al.', y: 2023, j: 'Pediatrics', s: 'limitations' },
          ].map((e, i) => (
            <View key={i} style={{ paddingTop: 12, paddingBottom: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: RGF.hair }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 15, lineHeight: 21, color: RGF.ink, fontStyle: 'italic', marginBottom: 8 }}>
                "{e.q}"
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: RGF.sans, fontSize: 11, color: RGF.muted }}>{e.a} · <Text style={{ fontStyle: 'italic' }}>{e.j}</Text> · {e.y}</Text>
                <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99, backgroundColor: RGF.bg }}>
                  <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.inkSoft, letterSpacing: 0.4, textTransform: 'uppercase' }}>{e.s}</Text>
                </View>
              </View>
            </View>
          ))}
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
