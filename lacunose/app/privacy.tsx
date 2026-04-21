import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../constants/theme';
import { ChipIcon } from '../components/Shared';

export default function ScreenPrivacy() {
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
        <Text style={{ fontFamily: RGF.display, fontSize: 36, color: RGF.ink, marginBottom: 20 }}>Privacy Policy</Text>
        <Text style={{ fontFamily: RGF.sans, fontSize: 15, color: RGF.inkSoft, lineHeight: 24 }}>
          Last updated: April 2026{'\n\n'}
          Your privacy is important to us. It is Lacunose's policy to respect your privacy regarding any information we may collect from you across our app.{'\n\n'}
          We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we're collecting it and how it will be used.{'\n\n'}
          We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we'll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.
        </Text>
      </ScrollView>
    </View>
  );
}
