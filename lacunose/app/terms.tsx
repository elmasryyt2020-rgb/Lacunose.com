import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../constants/theme';
import { ChipIcon } from '../components/Shared';

export default function ScreenTerms() {
  const router = useRouter();
  const { RGF } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: RGF.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 28, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChipIcon name="chevL" size={40} iconSize={14} bg={RGF.surface} />
          </TouchableOpacity>
        </View>
        <Text style={{ fontFamily: RGF.display, fontSize: 36, color: RGF.ink, marginBottom: 20 }}>Terms of Service</Text>
        <Text style={{ fontFamily: RGF.sans, fontSize: 15, color: RGF.inkSoft, lineHeight: 24 }}>
          Last updated: April 2026{'\n\n'}
          Welcome to Lacunose. These terms and conditions outline the rules and regulations for the use of our app.{'\n\n'}
          By accessing this app we assume you accept these terms and conditions. Do not continue to use Lacunose if you do not agree to take all of the terms and conditions stated on this page.{'\n\n'}
          1. Use of Service{'\n'}
          You must be at least 18 years of age to use this app. By using this app and by agreeing to these terms and conditions you warrant and represent that you are at least 18 years of age.{'\n\n'}
          2. Intellectual Property Rights{'\n'}
          Other than the content you own, under these terms, Lacunose and/or its licensors own all the intellectual property rights and materials contained in this app.
        </Text>
      </ScrollView>
    </View>
  );
}
