import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../constants/theme';
import { ChipIcon, Icon } from '../components/Shared';
import { useSupportThread } from '../hooks/useSupportThread';

export default function ScreenSupport() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { RGF } = useTheme();
  const { messages, sendMessage: sendReply, sendingIds } = useSupportThread();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    const txt = input;
    setInput('');
    await sendReply(txt);
  };

  return (
    <View style={[styles.container, { backgroundColor: RGF.bg }]}>
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 22, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: RGF.surface, borderBottomWidth: 1, borderBottomColor: RGF.hair }}>
        <TouchableOpacity onPress={() => router.back()}>
          <View style={{ transform: [{ scaleX: -1 }] }}>
            <ChipIcon name="chevL" size={40} iconSize={14} bg={RGF.surface} />
          </View>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: RGF.display, fontSize: 20, color: RGF.ink }}>Support</Text>
          <Text style={{ fontFamily: RGF.sans, fontSize: 11, color: RGF.mint }}>Usually responds in 5 min</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 22 }} showsVerticalScrollIndicator={false}>
          {messages.map(m => {
            const isSending = sendingIds?.has(m.id);
            return (
              <View key={m.id} style={{ alignItems: m.is_user ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
                <View style={{
                  maxWidth: '80%', padding: 16, borderRadius: 24,
                  backgroundColor: m.is_user ? RGF.ink : RGF.surface,
                  borderWidth: m.is_user ? 0 : 1, borderColor: RGF.hair,
                  borderBottomRightRadius: m.is_user ? 8 : 24,
                  borderBottomLeftRadius: m.is_user ? 24 : 8,
                  opacity: isSending ? 0.5 : 1
                }}>
                  <Text style={{ fontFamily: RGF.sans, fontSize: 15, lineHeight: 22, color: m.is_user ? RGF.bg : RGF.ink }}>
                    {m.body}
                  </Text>
                </View>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.muted, marginTop: 6, opacity: 0.6 }}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 22, paddingBottom: Math.max(20, insets.bottom), paddingTop: 10, backgroundColor: RGF.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: RGF.surface, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: RGF.hair }}>
            <TextInput 
              style={{ flex: 1, fontFamily: RGF.sans, fontSize: 15, color: RGF.ink, maxHeight: 100, paddingVertical: 6 }} 
              placeholder="Message support..."
              placeholderTextColor={RGF.muted}
              multiline
              value={input}
              onChangeText={setInput}
            />
            <TouchableOpacity onPress={handleSend} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: RGF.sky, alignItems: 'center', justifyContent: 'center', marginLeft: 10 }}>
              <Icon name="arrow" size={14} color={RGF.ink} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});
