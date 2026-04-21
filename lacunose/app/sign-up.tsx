import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { RGF } from '../constants/theme';
import { ChipIcon, Icon } from '../components/Shared';
import { Logo } from '../components/Logo';
import Svg, { Path, Rect } from 'react-native-svg';

function SocialBtn({ provider, onPress }: { provider: 'google' | 'apple' | 'email', onPress: () => void }) {
  const config = {
    google: { bg: '#fff', color: RGF.ink, border: RGF.hair, label: 'Continue with Google' },
    apple:  { bg: RGF.ink, color: '#fff', border: 'transparent', label: 'Continue with Apple' },
    email:  { bg: 'transparent', color: RGF.ink, border: RGF.ink, label: 'Continue with email' },
  }[provider];

  const icons = {
    google: (
      <Svg width="20" height="20" viewBox="0 0 24 24">
        <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <Path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
        <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
      </Svg>
    ),
    apple: (
      <Svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
        <Path d="M17.05 12.04c-.03-3.16 2.58-4.68 2.7-4.75-1.47-2.15-3.76-2.44-4.57-2.48-1.95-.2-3.8 1.15-4.79 1.15-.99 0-2.51-1.12-4.13-1.09-2.12.03-4.09 1.23-5.19 3.13-2.21 3.84-.56 9.52 1.6 12.63 1.05 1.52 2.3 3.22 3.94 3.16 1.58-.06 2.18-1.02 4.08-1.02 1.9 0 2.44 1.02 4.11.99 1.7-.03 2.77-1.54 3.81-3.07 1.2-1.76 1.69-3.47 1.72-3.56-.04-.02-3.29-1.26-3.32-5.01zM13.98 3.3C14.85 2.24 15.43.78 15.27-.67c-1.24.05-2.73.82-3.63 1.87-.8.93-1.51 2.41-1.32 3.83 1.38.11 2.79-.7 3.66-1.73z"/>
      </Svg>
    ),
    email: <Icon name="mail" size={20} color={RGF.ink} />,
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        backgroundColor: config.bg, borderWidth: 1, borderColor: config.border,
        borderRadius: 22, paddingVertical: 16, paddingHorizontal: 18,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10
      }}>
      {icons[provider]}
      <Text style={{ color: config.color, fontFamily: RGF.sansMedium, fontSize: 15, letterSpacing: -0.2 }}>
        {config.label}
      </Text>
    </TouchableOpacity>
  );
}

function FormInput({ icon, placeholder, secure, optional }: { icon: string, placeholder: string, secure?: boolean, optional?: boolean }) {
  return (
    <View style={styles.inputBox}>
      <Icon name={icon} size={18} color={RGF.muted} />
      <TextInput 
        style={{ flex: 1, fontFamily: RGF.sans, fontSize: 15, color: RGF.ink, padding: 0 }}
        placeholder={placeholder}
        placeholderTextColor={RGF.muted}
        secureTextEntry={secure}
      />
      {optional && <Text style={{ fontFamily: RGF.sans, fontSize: 11, color: RGF.muted, textTransform: 'uppercase' }}>Optional</Text>}
      {secure && <Icon name="eye" size={18} color={RGF.muted} />}
    </View>
  );
}

export default function ScreenSignUp() {
  const router = useRouter();
  const [isEmail, setIsEmail] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSignIn = () => router.push('/sign-in');
  const handleHome = () => router.replace('/(tabs)/home');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => isEmail ? setIsEmail(false) : router.back()}>
            <ChipIcon name="chevL" size={40} iconSize={14} />
          </TouchableOpacity>
          <Logo size={36} />
        </View>

        <Text style={styles.headline}>
          Create your{'\n'}<Text style={{ fontStyle: 'italic' }}>account.</Text>
        </Text>
        
        <Text style={styles.paragraph}>
          {isEmail ? 'Just a few details to set up your profile.' : 'Save this gap and explore 7 more.\nFree forever, 3 analyses a month.'}
        </Text>

        {!isEmail ? (
          <>
            <View style={{ flex: 1, minHeight: 60 }} />
            <View style={{ gap: 10 }}>
              <SocialBtn provider="google" onPress={handleHome} />
              <SocialBtn provider="apple" onPress={handleHome} />
              <SocialBtn provider="email" onPress={() => setIsEmail(true)} />
            </View>
          </>
        ) : (
          <View style={{ gap: 10, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.inputBox, { flex: 1 }]}>
                <TextInput style={styles.inputText} placeholder="First name" placeholderTextColor={RGF.muted} />
              </View>
              <View style={[styles.inputBox, { flex: 1 }]}>
                <TextInput style={styles.inputText} placeholder="Last name" placeholderTextColor={RGF.muted} />
              </View>
            </View>
            <FormInput icon="mail" placeholder="Email address" />
            <FormInput icon="phone" placeholder="Phone number" />
            <FormInput icon="link" placeholder="ORCID iD" optional />
            <FormInput icon="lock" placeholder="Password" secure />
            <FormInput icon="check" placeholder="Confirm password" secure />
            
            <TouchableOpacity onPress={handleHome} activeOpacity={0.8} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Register</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={{ textAlign: 'center', fontFamily: RGF.sans, fontSize: 11, color: RGF.muted, marginTop: 28, lineHeight: 17 }}>
          By continuing you agree to our{'\n'}
          <Text onPress={() => router.push('/terms')} style={{ color: RGF.inkSoft, textDecorationLine: 'underline' }}>Terms</Text>
          {' · '}
          <Text onPress={() => router.push('/privacy')} style={{ color: RGF.inkSoft, textDecorationLine: 'underline' }}>Privacy</Text>
        </Text>

        <TouchableOpacity onPress={handleSignIn} style={{ alignItems: 'center', marginTop: 16, padding: 10 }}>
          <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }}>
            Already have an account? <Text style={{ color: RGF.ink, fontFamily: RGF.sansMedium, textDecorationLine: 'underline' }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: RGF.bg,
    paddingTop: 60, paddingHorizontal: 28,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40,
  },
  headline: {
    fontFamily: RGF.display, fontSize: 44, lineHeight: 45, letterSpacing: -1.4, color: RGF.ink, marginBottom: 14,
  },
  paragraph: {
    fontFamily: RGF.sans, fontSize: 15, color: RGF.inkSoft, lineHeight: 22, marginBottom: 36,
  },
  inputBox: {
    backgroundColor: '#fff', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: RGF.hair, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52
  },
  inputText: {
    flex: 1, fontFamily: RGF.sans, fontSize: 15, color: RGF.ink, padding: 0
  },
  primaryBtn: {
    backgroundColor: RGF.ink, borderRadius: 22, paddingVertical: 16, alignItems: 'center', marginTop: 10
  },
  primaryBtnText: {
    fontFamily: RGF.sansSemiBold, fontSize: 15, color: '#fff'
  }
});
