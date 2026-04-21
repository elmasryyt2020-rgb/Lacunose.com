import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { RGF } from '../constants/theme';
import { Logo } from '../components/Logo';

export default function ScreenGetStarted() {
  const router = useRouter();
  const appName = 'Lacunose';

  return (
    <View style={styles.container}>
      {/* ambient floating color blobs behind */}
      <View style={[styles.blob, { top: 140, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: RGF.butter, opacity: 0.55 }]} />
      <View style={[styles.blob, { top: 420, left: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: RGF.sky, opacity: 0.5 }]} />
      <View style={[styles.blob, { top: 320, right: 40, width: 120, height: 120, borderRadius: 60, backgroundColor: RGF.lavender, opacity: 0.6 }]} />

      <View style={{ marginBottom: 40, position: 'relative', zIndex: 2 }}>
        <Logo size={56}/>
      </View>

      <Text style={{
        fontFamily: RGF.display, fontSize: 52, lineHeight: 54,
        letterSpacing: -1.8, color: RGF.ink, marginBottom: 18,
        position: 'relative', zIndex: 2,
      }}>
        Find the{'\n'}<Text style={{ fontStyle: 'italic' }}>space</Text> where{'\n'}you matter.
      </Text>
      
      <Text style={{ fontFamily: RGF.sans, fontSize: 16, color: RGF.inkSoft, lineHeight: 24, marginBottom: 40, position: 'relative', zIndex: 2 }}>
        {appName} turns <Text style={{ fontStyle: 'italic' }}>5,000</Text> medical{'\n'}papers into one unanswered{'\n'}question — yours.
      </Text>

      <View style={{ flex: 1 }} />

      {/* Single centered CTA */}
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => router.push('/onboarding')}
        style={{ 
          backgroundColor: RGF.ink, borderRadius: 28, paddingVertical: 22, paddingHorizontal: 20,
          alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2,
        }}>
        <Text style={{ fontFamily: RGF.sansSemiBold, color: '#fff', fontSize: 17, letterSpacing: -0.2 }}>
          Get started
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => router.push('/sign-in')}
        style={{ alignItems: 'center', marginTop: 16, position: 'relative', zIndex: 2, padding: 10 }}>
        <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }}>
          Already have an account? <Text style={{ color: RGF.ink, fontFamily: RGF.sansMedium, textDecorationLine: 'underline' }}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RGF.bg,
    paddingTop: 80,
    paddingHorizontal: 28,
    paddingBottom: 40,
    position: 'relative',
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
  }
});
