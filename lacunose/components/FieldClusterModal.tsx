import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useTheme } from '../constants/theme';
import { Icon } from './Shared';
import { FIELD_CLUSTERS, FRAMES } from '../lib/fields/frames';
import { useConceptSearch } from '../hooks/useConceptSearch';

type FieldClusterModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (selection: { frameId: string; openalexId?: string; label: string }) => void;
};

export function FieldClusterModal({ visible, onClose, onSelect }: FieldClusterModalProps) {
  const { RGF } = useTheme();
  const [query, setQuery] = useState('');
  const { data: searchResults, isFetching } = useConceptSearch(query);

  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  const handleSelectField = (fieldId: string) => {
    const frame = FRAMES[fieldId];
    if (frame) {
      onSelect({ frameId: fieldId, label: frame.label });
    }
  };

  const handleSelectConcept = (concept: any) => {
    // Raw OpenAlex concepts aren't in our FRAMES catalog, so we route them
    // through the generic frame template and let the backend narrow the
    // corpus by concept_id (see analyze screen submit → POST /v1/analyses).
    onSelect({
      frameId: 'generic',
      openalexId: concept.openalex_id,
      label: concept.name,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={Platform.OS === 'android'}
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: Platform.OS === 'android' ? 'rgba(0,0,0,0.5)' : undefined, justifyContent: 'flex-end' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: RGF.bg, flex: Platform.OS === 'android' ? 0.9 : 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
            <View style={{ width: 40, height: 4, backgroundColor: RGF.muted, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontFamily: RGF.display, fontSize: 28, color: RGF.ink, marginBottom: 16 }}>Pick a field</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: RGF.surface, borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: RGF.hair, marginBottom: 16 }}>
              <Icon name="search" size={20} color={RGF.muted} />
              <TextInput
                style={{ flex: 1, marginLeft: 8, fontFamily: RGF.sans, fontSize: 16, color: RGF.ink }}
                placeholder="Search concepts..."
                placeholderTextColor={RGF.muted}
                value={query}
                onChangeText={setQuery}
              />
              {isFetching && <ActivityIndicator size="small" color={RGF.ink} />}
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Icon name="close" size={20} color={RGF.muted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              {query.trim().length >= 2 ? (
                <View>
                  {searchResults?.map(hit => (
                    <TouchableOpacity key={hit.openalex_id} onPress={() => handleSelectConcept(hit)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: RGF.hair, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ fontFamily: RGF.sansMedium, fontSize: 16, color: RGF.ink }}>{hit.name}</Text>
                        {hit.hint && <Text style={{ fontFamily: RGF.sans, fontSize: 14, color: RGF.muted, marginTop: 4 }}>{hit.hint}</Text>}
                      </View>
                      <Icon name="chevR" size={20} color={RGF.muted} />
                    </TouchableOpacity>
                  ))}
                  {searchResults?.length === 0 && !isFetching && (
                    <Text style={{ fontFamily: RGF.sans, fontSize: 16, color: RGF.muted, textAlign: 'center', marginTop: 32 }}>No concepts found.</Text>
                  )}
                </View>
              ) : (
                <View>
                  {FIELD_CLUSTERS.map(cluster => {
                    const isExpanded = expandedCluster === cluster.id;
                    return (
                      <View key={cluster.id} style={{ backgroundColor: RGF.surface, borderRadius: 16, borderWidth: 1, borderColor: RGF.hair, marginBottom: 12, overflow: 'hidden' }}>
                        <TouchableOpacity onPress={() => setExpandedCluster(isExpanded ? null : cluster.id)} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ fontFamily: RGF.display, fontSize: 22, color: RGF.ink }}>{cluster.label}</Text>
                          <Icon name={isExpanded ? 'chevD' : 'chevR'} size={24} color={RGF.muted} />
                        </TouchableOpacity>
                        
                        {!isExpanded ? (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
                            {cluster.fields.slice(0, 3).map(fieldId => (
                              <TouchableOpacity key={fieldId} onPress={() => handleSelectField(fieldId)} style={{ backgroundColor: RGF.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: RGF.hair }}>
                                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 14, color: RGF.ink }}>{FRAMES[fieldId]?.label || fieldId}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : (
                          <View style={{ paddingBottom: 8 }}>
                            {cluster.fields.map(fieldId => (
                              <TouchableOpacity key={fieldId} onPress={() => handleSelectField(fieldId)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: RGF.hair }}>
                                <Icon name="book" size={20} color={RGF.muted} />
                                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 16, color: RGF.ink, flex: 1, marginLeft: 12 }}>{FRAMES[fieldId]?.label || fieldId}</Text>
                                <Icon name="chevR" size={20} color={RGF.muted} />
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
