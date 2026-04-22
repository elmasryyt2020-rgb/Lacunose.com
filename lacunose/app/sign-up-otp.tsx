import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../constants/theme';
import { ChipIcon } from '../components/Shared';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { isMockMode } from '../lib/mocks';
import * as Sentry from '@sentry/react-native';

const RESEND_COOLDOWN_SEC = 30;

export default function ScreenOTP() {
  const router = useRouter();
  const { RGF } = useTheme();
  const insets = useSafeAreaInsets();
  // Params may legitimately be undefined on a cold deep-link.
  const params = useLocalSearchParams<{ email?: string; first?: string; last?: string; phone?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const firstName = typeof params.first === 'string' ? params.first : '';
  const lastName = typeof params.last === 'string' ? params.last : '';
  const phone = typeof params.phone === 'string' ? params.phone : '';
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<TextInput>(null);

  // Programmatic focus after mount (avoid autoFocus anti-pattern on Android).
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  // Cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerify = async () => {
    if (verifying) return;
    if (!token || token.length !== 6 || !email) {
      Alert.alert('Enter the 6-digit code we emailed you.');
      return;
    }
    setVerifying(true);
    try {
      if (isMockMode) {
        router.replace('/(tabs)/home');
        return;
      }
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      if (error) throw error;

      // Attach the sign-up metadata if we carried any fields from the previous screen.
      // Best-effort — a failure here shouldn't block the user from entering the app.
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
      const metadata: Record<string, string> = {};
      if (fullName) metadata.full_name = fullName;
      if (phone) metadata.phone = phone;
      if (Object.keys(metadata).length > 0) {
        try {
          await supabase.auth.updateUser({ data: metadata });
        } catch (metaErr) {
          Sentry.captureException(metaErr);
        }
      }

      router.replace('/(tabs)/home');
    } catch (e) {
      Sentry.captureException(e);
      const msg = (e as Error)?.message ?? 'Could not verify that code.';
      Alert.alert('Verification failed', msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    try {
      if (isMockMode) {
        Alert.alert('Mock mode', 'Would have resent the code.');
      } else {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        Alert.alert('Code sent', `A new code is on its way to ${email}.`);
      }
      setCooldown(RESEND_COOLDOWN_SEC);
    } catch (e) {
      Sentry.captureException(e);
      Alert.alert('Resend failed', (e as Error)?.message ?? 'Please try again.');
    } finally {
      setResending(false);
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
        We sent a 6-digit code to {email || 'your email'}
      </Text>

      <View style={[styles.inputBox, { backgroundColor: RGF.surface, borderColor: RGF.hair, marginBottom: 20 }]}>
        <TextInput
          ref={inputRef}
          style={{ flex: 1, fontFamily: RGF.sans, fontSize: 24, color: RGF.ink, padding: 0, textAlign: 'center', letterSpacing: 8 }}
          placeholder="000000"
          placeholderTextColor={RGF.muted}
          keyboardType="number-pad"
          maxLength={6}
          value={token}
          onChangeText={setToken}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
        />
      </View>

      <TouchableOpacity
        onPress={handleVerify}
        activeOpacity={0.8}
        disabled={verifying || token.length !== 6}
        style={[styles.primaryBtn, {
          backgroundColor: RGF.ink,
          opacity: (verifying || token.length !== 6) ? 0.55 : 1,
        }]}
      >
        <Text style={[styles.primaryBtnText, { color: RGF.bg }]}>
          {verifying ? 'Verifying…' : 'Verify Code'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleResend}
        disabled={resending || cooldown > 0}
        activeOpacity={0.7}
        style={{ alignSelf: 'center', marginTop: 18, padding: 8 }}
      >
        <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: cooldown > 0 ? RGF.muted : RGF.ink }}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending…' : 'Resend code'}
        </Text>
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
  primaryBtnText: { fontFamily: 'SansSemiBold', fontSize: 15 },
});
