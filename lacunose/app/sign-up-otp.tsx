import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../constants/theme';
import { ChipIcon } from '../components/Shared';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

export default function ScreenOTP() {
  const router = useRouter();
  const { RGF } = useTheme();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [token, setToken] = useState('');

  const handleVerify = async () => {
    if (!token || !email) return;
    if (process.env.EXPO_PUBLIC_USE_MOCKS === 'true') {
      router.replace('/(tabs)/home');
      return;
    }
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      if (error) throw error;
      router.replace('/(tabs)/home');
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <View style={[styles.container, { backgroundColor: RGF.bg, paddingBottom: 60 + insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChipIcon name="chevL" size={40} iconSize={14} bg={RGF.surface} />
        </TouchableOpacity>
        <Logo size={36} />
      </View>

      <Text style={[styles.headline, { color: RGF.ink }]}>
        Check your{'\n'}<Text style={{ fontStyle: 'italic' }}>inbox.</Text>
      </Text>
      
      <Text style={[styles.paragraph, { color: RGF.inkSoft }]}>
        We sent a 6-digit code to {email}
      </Text>

      <View style={[styles.inputBox, { backgroundColor: RGF.surface, borderColor: RGF.hair, marginBottom: 20 }]}>
        <TextInput 
          style={{ flex: 1, fontFamily: RGF.sans, fontSize: 24, color: RGF.ink, padding: 0, textAlign: 'center', letterSpacing: 8 }}
          placeholder="000000"
          placeholderTextColor={RGF.muted}
          keyboardType="number-pad"
          maxLength={6}
          value={token}
          onChangeText={setToken}
          autoFocus
        />
      </View>

      <TouchableOpacity onPress={handleVerify} activeOpacity={0.8} style={[styles.primaryBtn, { backgroundColor: RGF.ink }]}>
        <Text style={[styles.primaryBtnText, { color: RGF.bg }]}>Verify Code</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 28 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  headline: { fontFamily: 'Display', fontSize: 44, lineHeight: 45, letterSpacing: -1.4, marginBottom: 14 },
  paragraph: { fontFamily: 'Sans', fontSize: 15, lineHeight: 22, marginBottom: 36 },
  inputBox: { borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, minHeight: 64, justifyContent: 'center' },
  primaryBtn: { borderRadius: 22, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  primaryBtnText: { fontFamily: 'SansSemiBold', fontSize: 15 }
});
