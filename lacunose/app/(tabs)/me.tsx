import React from 'react';
import { View, Text } from 'react-native';
import { RGF } from '../../constants/theme';

export default function ScreenMe() {
  return (
    <View style={{ flex: 1, backgroundColor: RGF.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: RGF.sansMedium, color: RGF.inkSoft }}>Profile Settings</Text>
    </View>
  );
}
