import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { RGF } from '../../constants/theme';
import { ChipIcon, Icon } from '../../components/Shared';

const FIELDS = [
  { id: 'medicine', label: 'Medicine' },
  { id: 'cs', label: 'Computer Science' },
  { id: 'econ', label: 'Economics' },
  { id: 'psych', label: 'Psychology' },
];

const FRAMES: Record<string, any[]> = {
  medicine: [
    { letter: 'P', label: 'Population', initialValue: 'Children 6–17', color: RGF.rose },
    { letter: 'I', label: 'Intervention', initialValue: 'Semaglutide 2.4mg', color: RGF.lavender },
    { letter: 'C', label: 'Comparator', initialValue: 'Lifestyle only', color: RGF.mint },
    { letter: 'O', label: 'Outcome', initialValue: 'Weight reduction', color: RGF.sky },
  ],
  cs: [
    { letter: 'T', label: 'Task', initialValue: 'Image segmentation', color: RGF.rose },
    { letter: 'D', label: 'Dataset', initialValue: 'COCO-Stuff', color: RGF.lavender },
    { letter: 'M', label: 'Method', initialValue: 'Contrastive learning', color: RGF.mint },
    { letter: 'M', label: 'Metric', initialValue: 'mIoU', color: RGF.sky },
  ],
  econ: [
    { letter: 'T', label: 'Treatment', initialValue: 'Universal Basic Income', color: RGF.rose },
    { letter: 'P', label: 'Population', initialValue: 'Low-income households', color: RGF.lavender },
    { letter: 'O', label: 'Outcome', initialValue: 'Labor participation', color: RGF.mint },
    { letter: 'I', label: 'Strategy', initialValue: 'Difference-in-differences', color: RGF.sky },
  ],
  psych: [
    { letter: 'S', label: 'Sample', initialValue: 'Undergraduate students', color: RGF.rose },
    { letter: 'P', label: 'Phenomenon', initialValue: 'Cognitive dissonance', color: RGF.lavender },
    { letter: 'D', label: 'Design', initialValue: 'Factorial experiment', color: RGF.mint },
    { letter: 'E', label: 'Evaluation', initialValue: 'Self-report scale', color: RGF.sky },
  ],
};

function FilterRow({ label, value, muted, last, isSwitch, switchValue, onSwitch, onPress }: any) {
  return (
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress} style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 18,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: RGF.hair,
    }}>
      <Text style={{ fontFamily: RGF.sansMedium, fontSize: 14, color: RGF.ink }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {isSwitch ? (
          <Switch value={switchValue} onValueChange={onSwitch} trackColor={{ false: RGF.hair, true: RGF.ink }} thumbColor="#fff" style={{ transform: [{ scale: 0.8 }] }} />
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

function FrameRow({ letter, label, initialValue, color }: any) {
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

export default function ScreenAnalyze() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [activeField, setActiveField] = useState('medicine');
  const [topic, setTopic] = useState('GLP-1 agonists for pediatric obesity');
  const [preprints, setPreprints] = useState(true);
  const [openAccess, setOpenAccess] = useState(false);
  const [isYearsModalVisible, setYearsModalVisible] = useState(false);
  const [selectedYears, setSelectedYears] = useState('2019–2026');
  const [isDesignModalVisible, setDesignModalVisible] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState('All');
  
  const activeLabel = FIELDS.find(f => f.id === activeField)?.label || 'medicine';
  const currentFrame = FRAMES[activeField] || FRAMES['medicine'];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/home')}>
            <ChipIcon name="close" size={40} iconSize={16} />
          </TouchableOpacity>
          <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }}>2 of 3 used this month</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 22, height: 36, marginBottom: 20 }} style={{ marginHorizontal: -22, paddingHorizontal: 22 }}>
          {FIELDS.map((f, i) => {
            const isActive = activeField === f.id;
            return (
              <TouchableOpacity key={f.id} onPress={() => setActiveField(f.id)} activeOpacity={0.7} style={{
                paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99,
                backgroundColor: isActive ? RGF.ink : '#fff',
                borderWidth: 1, borderColor: isActive ? RGF.ink : RGF.hair,
                justifyContent: 'center',
              }}>
                <Text style={{ fontFamily: isActive ? RGF.sansMedium : RGF.sans, fontSize: 13, color: isActive ? '#fff' : RGF.ink }}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <Text style={{ fontFamily: RGF.display, fontSize: 42, lineHeight: 43, letterSpacing: -1.3, color: RGF.ink, marginBottom: 26 }}>
          What area of{'\n'}<Text style={{ fontStyle: 'italic', textDecorationLine: 'underline', textDecorationColor: RGF.hair }}>{activeLabel.toLowerCase()}</Text>{'\n'}do you want to explore?
        </Text>

        {/* topic box */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 26, padding: 20, minHeight: 180, marginBottom: 20,
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
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <ChipIcon name="paperclip" size={32} iconSize={14} bg={RGF.bg} />
              <ChipIcon name="mic" size={32} iconSize={14} bg={RGF.bg} />
            </View>
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
              <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>Auto-filled</Text>
            </View>
          </View>
          
          <View style={{ gap: 10 }}>
            {currentFrame.map((r, idx) => (
              <FrameRow key={`${activeField}-${idx}`} {...r} />
            ))}
          </View>
        </View>

        {/* filter toggles */}
        <View style={{ backgroundColor: '#fff', borderRadius: 24, paddingVertical: 6, borderWidth: 1, borderColor: RGF.hair, marginBottom: 24 }}>
          <FilterRow label="Include preprints" isSwitch switchValue={preprints} onSwitch={setPreprints} />
          <FilterRow label="Open-access only" isSwitch switchValue={openAccess} onSwitch={setOpenAccess} />
          <FilterRow label="Years" value={selectedYears} onPress={() => setYearsModalVisible(true)} />
          <FilterRow label="Study designs" value={selectedDesign} last onPress={() => setDesignModalVisible(true)} />
        </View>

        {/* CTA */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => router.push('/analyze/results')}
          style={{
            backgroundColor: RGF.ink, borderRadius: 28, padding: 20,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
          <View>
            <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: '#fff', letterSpacing: -0.3 }}>Find gaps</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>≈ 45 sec · 500 papers</Text>
          </View>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow" size={20} color={RGF.ink} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={isYearsModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: RGF.bg, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 26, paddingBottom: Math.max(40, insets.bottom + 20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 26, color: RGF.ink }}>Select Years</Text>
              <TouchableOpacity onPress={() => setYearsModalVisible(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={RGF.ink} />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 10 }}>
              {['2019–2026', '2014–2026', 'All time', 'Custom range'].map((y) => (
                <TouchableOpacity key={y} onPress={() => { setSelectedYears(y); setYearsModalVisible(false); }} style={{ paddingVertical: 14, paddingHorizontal: 18, borderRadius: 18, backgroundColor: selectedYears === y ? RGF.ink : '#fff', borderWidth: 1, borderColor: selectedYears === y ? RGF.ink : RGF.hair }}>
                  <Text style={{ fontFamily: RGF.sansMedium, fontSize: 14, color: selectedYears === y ? '#fff' : RGF.ink }}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isDesignModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: RGF.bg, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 26, paddingBottom: Math.max(40, insets.bottom + 20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 26, color: RGF.ink }}>Study Designs</Text>
              <TouchableOpacity onPress={() => setDesignModalVisible(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={RGF.ink} />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 10 }}>
              {['All', 'Randomized Controlled Trials', 'Systematic Reviews', 'Cohort Studies', 'Case Reports'].map((d) => (
                <TouchableOpacity key={d} onPress={() => { setSelectedDesign(d); setDesignModalVisible(false); }} style={{ paddingVertical: 14, paddingHorizontal: 18, borderRadius: 18, backgroundColor: selectedDesign === d ? RGF.ink : '#fff', borderWidth: 1, borderColor: selectedDesign === d ? RGF.ink : RGF.hair }}>
                  <Text style={{ fontFamily: RGF.sansMedium, fontSize: 14, color: selectedDesign === d ? '#fff' : RGF.ink }}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
