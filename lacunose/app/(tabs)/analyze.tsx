import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../constants/theme';
import { ChipIcon, Icon } from '../../components/Shared';
import { FieldClusterModal } from '../../components/FieldClusterModal';
import { FRAMES, QUICK_FIELDS } from '../../lib/fields/frames';
import { fetchApi } from '../../lib/api/client';
import { isMockMode } from '../../lib/mocks';
import { useEntitlement } from '../../hooks/useEntitlement';

function FilterRow({ label, value, muted, last, isSwitch, switchValue, onSwitch, onPress }: any) {
  const { RGF } = useTheme();
  return (
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress} style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      height: 52, paddingHorizontal: 18,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: RGF.hair,
    }}>
      <Text style={{ fontFamily: RGF.sansMedium, fontSize: 14, color: RGF.ink }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {isSwitch ? (
          <Switch value={switchValue} onValueChange={onSwitch} trackColor={{ false: RGF.hair, true: RGF.ink }} thumbColor={RGF.bg} style={{ transform: [{ scale: 0.75 }] }} />
        ) : (
          <>
            <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: muted ? RGF.muted : RGF.ink }}>{value}</Text>
            <Icon name="chevR" size={14} color={RGF.muted} />
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

function FrameRow({ letter, label, value, onChange, color, placeholder }: any) {
  const { RGF } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const isEmpty = !value;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setIsEditing(true)}
      style={{
        backgroundColor: RGF.surface, borderRadius: 18, padding: 12,
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
            onChangeText={onChange}
            onBlur={() => setIsEditing(false)}
            placeholder={placeholder}
            placeholderTextColor={RGF.muted}
          />
        ) : (
          <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: isEmpty ? RGF.muted : RGF.ink }} numberOfLines={1}>
            {isEmpty ? (placeholder ?? 'Tap to add') : value}
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

export default function ScreenAnalyze() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { RGF, displayShadow } = useTheme();
  const { search } = useLocalSearchParams<{ search?: string }>();


  const [fieldSelection, setFieldSelection] = useState<{ frameId: string; openalexId?: string; label: string }>({
    frameId: 'medicine',
    label: FRAMES['medicine']?.label || 'Medicine'
  });
  const [topic, setTopic] = useState('');
  const [preprints, setPreprints] = useState(true);
  const [openAccess, setOpenAccess] = useState(false);
  const [isYearsModalVisible, setYearsModalVisible] = useState(false);
  const [selectedYears, setSelectedYears] = useState('2019–2026');
  const [isDesignModalVisible, setDesignModalVisible] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState('All');
  const [isFieldModalVisible, setFieldModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { data: entitlement } = useEntitlement();

  const activeLabel = fieldSelection.label;
  const currentFrame = FRAMES[fieldSelection.frameId] || FRAMES['generic'];

  // Frame values keyed by row.key ('P','I','C','O', …).
  // Start empty — the `example` from frames.ts is used as a placeholder hint,
  // not a default fill, so the user isn't surprised by pre-filled rows that
  // don't match their actual topic.
  const [frameValues, setFrameValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(currentFrame.rows.map(r => [r.key, '']))
  );
  useEffect(() => {
    // Clear — not seed with examples — when the field changes, so labels stay honest.
    setFrameValues(Object.fromEntries(currentFrame.rows.map(r => [r.key, ''])));
  }, [fieldSelection.frameId, fieldSelection.openalexId]);

  // One-shot prefill from /home?search=... deep link.
  useEffect(() => {
    if (typeof search === 'string' && search.trim()) {
      setTopic(search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const yearsRange = useMemo<[number, number] | undefined>(() => {
    if (selectedYears === 'All time') return undefined;
    const m = selectedYears.match(/(\d{4})[^\d]+(\d{4})/);
    if (!m) return undefined;
    return [Number(m[1]), Number(m[2])];
  }, [selectedYears]);

  async function handleSubmit() {
    if (!topic.trim() || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        topic: topic.trim(),
        field: fieldSelection.frameId,
        structured_frame: frameValues,
        filters: {
          years: yearsRange,
          include_preprints: preprints,
          open_access_only: openAccess,
          study_designs: selectedDesign === 'All' ? undefined : [selectedDesign],
        },
        concept_id: fieldSelection.openalexId,
      };

      if (isMockMode) {
        router.push('/analyze/results?id=mock-1');
        return;
      }

      const res = await fetchApi('/v1/analyses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res?.id) throw new Error('missing analysis id');
      router.push(`/analyze/results?id=${encodeURIComponent(res.id)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start analysis';
      Alert.alert('Could not start analysis', msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: RGF.bg }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/home')}>
            <ChipIcon name="close" size={40} iconSize={16} bg={RGF.surface} />
          </TouchableOpacity>
          <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }}>
            {entitlement ? `${entitlement.analysesUsed} of ${entitlement.analysesCap} used this month` : ' '}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 22, height: 36, marginBottom: 20 }} style={{ marginHorizontal: -22, paddingHorizontal: 22 }}>
          {QUICK_FIELDS.map((fId) => {
            const frame = FRAMES[fId];
            if (!frame) return null;
            const isActive = fieldSelection.frameId === fId && !fieldSelection.openalexId;
            return (
              <TouchableOpacity key={fId} onPress={() => setFieldSelection({ frameId: fId, label: frame.label })} activeOpacity={0.7} style={{
                paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99,
                backgroundColor: isActive ? RGF.ink : RGF.surface,
                borderWidth: 1, borderColor: isActive ? RGF.ink : RGF.hair,
                justifyContent: 'center',
              }}>
                <Text style={{ fontFamily: isActive ? RGF.sansMedium : RGF.sans, fontSize: 13, color: isActive ? RGF.bg : RGF.ink }}>
                  {frame.label}
                </Text>
              </TouchableOpacity>
            )
          })}
          <TouchableOpacity onPress={() => setFieldModalVisible(true)} activeOpacity={0.7} style={{
            paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99,
            backgroundColor: (fieldSelection.openalexId || !QUICK_FIELDS.includes(fieldSelection.frameId as any)) ? RGF.ink : RGF.surface,
            borderWidth: 1, borderColor: (fieldSelection.openalexId || !QUICK_FIELDS.includes(fieldSelection.frameId as any)) ? RGF.ink : RGF.hair,
            justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
          }}>
            <Icon name="sparkle" size={12} color={(fieldSelection.openalexId || !QUICK_FIELDS.includes(fieldSelection.frameId as any)) ? RGF.bg : RGF.ink} />
            <Text style={{ fontFamily: (fieldSelection.openalexId || !QUICK_FIELDS.includes(fieldSelection.frameId as any)) ? RGF.sansMedium : RGF.sans, fontSize: 13, color: (fieldSelection.openalexId || !QUICK_FIELDS.includes(fieldSelection.frameId as any)) ? RGF.bg : RGF.ink }}>
              More fields
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <Text style={{ fontFamily: RGF.display, fontSize: 42, lineHeight: 43, letterSpacing: -1.3, color: RGF.ink, marginBottom: 26, ...displayShadow }}>
          What area of{'\n'}<Text style={{ fontFamily: RGF.displayItalic, textDecorationLine: 'underline', textDecorationColor: RGF.hair }}>{activeLabel.toLowerCase()}</Text>{'\n'}do you want to explore?
        </Text>

        {/* topic box */}
        <View style={{
          backgroundColor: RGF.surface, borderRadius: 26, padding: 20, minHeight: 180, marginBottom: 20,
          borderWidth: 1, borderColor: RGF.hair,
        }}>
          <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
            Topic
          </Text>
          <TextInput
            style={{ flex: 1, fontFamily: RGF.sans, fontSize: 20, lineHeight: 28, color: RGF.ink, letterSpacing: -0.3, textAlignVertical: 'top' }}
            value={topic}
            onChangeText={setTopic}
            multiline
            maxLength={240}
            placeholder={`e.g. long-context attention mechanisms in ${activeLabel.toLowerCase()}`}
            placeholderTextColor={RGF.muted}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <View />
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>{topic.length} / 240</Text>
          </View>
        </View>

        {/* Dynamic Structured Frame */}
        <View style={{ marginBottom: 26 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>
              Structured ontology
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="sparkle" size={14} color={RGF.muted} />
              <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>Optional</Text>
            </View>
          </View>
          
          <View style={{ gap: 10 }}>
            {currentFrame.rows.map((r, idx) => (
              <FrameRow
                key={`${fieldSelection.frameId}-${fieldSelection.openalexId}-${idx}`}
                letter={r.key}
                label={r.label}
                value={frameValues[r.key] ?? ''}
                onChange={(v: string) => setFrameValues(prev => ({ ...prev, [r.key]: v }))}
                color={(RGF as any)[r.color]}
                placeholder={r.placeholder}
              />
            ))}
          </View>
        </View>

        {/* filter toggles */}
        <View style={{ backgroundColor: RGF.surface, borderRadius: 24, paddingVertical: 6, borderWidth: 1, borderColor: RGF.hair, marginBottom: 24 }}>
          <FilterRow label="Include preprints" isSwitch switchValue={preprints} onSwitch={setPreprints} />
          <FilterRow label="Open-access only" isSwitch switchValue={openAccess} onSwitch={setOpenAccess} />
          <FilterRow label="Years" value={selectedYears} onPress={() => setYearsModalVisible(true)} />
          <FilterRow label="Study designs" value={selectedDesign} last onPress={() => setDesignModalVisible(true)} />
        </View>

        {/* CTA */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={submitting || !topic.trim()}
          style={{
            backgroundColor: RGF.ink, borderRadius: 28, padding: 20,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            opacity: (submitting || !topic.trim()) ? 0.55 : 1,
          }}>
          <View>
            <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: RGF.bg, letterSpacing: -0.3 }}>
              {submitting ? 'Starting…' : 'Find gaps'}
            </Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.bg, opacity: 0.6, marginTop: 2 }}>
              ≈ 45 sec · 500 papers
            </Text>
          </View>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: RGF.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow" size={20} color={RGF.ink} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* years modal */}
      <Modal visible={isYearsModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: RGF.bg, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 26, paddingBottom: Math.max(40, insets.bottom + 20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 26, color: RGF.ink }}>Select Years</Text>
              <TouchableOpacity onPress={() => setYearsModalVisible(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: RGF.hair, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={RGF.ink} />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 10 }}>
              {['2019–2026', '2014–2026', 'All time', 'Custom range'].map((y) => (
                <TouchableOpacity key={y} onPress={() => { setSelectedYears(y); setYearsModalVisible(false); }} style={{ paddingVertical: 14, paddingHorizontal: 18, borderRadius: 18, backgroundColor: selectedYears === y ? RGF.ink : RGF.surface, borderWidth: 1, borderColor: selectedYears === y ? RGF.ink : RGF.hair }}>
                  <Text style={{ fontFamily: RGF.sansMedium, fontSize: 14, color: selectedYears === y ? RGF.bg : RGF.ink }}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* study designs modal */}
      <Modal visible={isDesignModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: RGF.bg, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 26, paddingBottom: Math.max(40, insets.bottom + 20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 26, color: RGF.ink }}>Study Designs</Text>
              <TouchableOpacity onPress={() => setDesignModalVisible(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: RGF.hair, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={RGF.ink} />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 10 }}>
              {['All', 'Systematic Reviews', 'RCTs', 'Cohort Studies', 'Case Reports'].map((d) => (
                <TouchableOpacity key={d} onPress={() => { setSelectedDesign(d); setDesignModalVisible(false); }} style={{ paddingVertical: 14, paddingHorizontal: 18, borderRadius: 18, backgroundColor: selectedDesign === d ? RGF.ink : RGF.surface, borderWidth: 1, borderColor: selectedDesign === d ? RGF.ink : RGF.hair }}>
                  <Text style={{ fontFamily: RGF.sansMedium, fontSize: 14, color: selectedDesign === d ? RGF.bg : RGF.ink }}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <FieldClusterModal 
        visible={isFieldModalVisible} 
        onClose={() => setFieldModalVisible(false)} 
        onSelect={(sel) => { setFieldSelection(sel); setFieldModalVisible(false); }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingHorizontal: 22 }
});
