import React from 'react';
import { View } from 'react-native';
import { RGF } from '../constants/theme';

export function Logo({ size = 56 }: { size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.32, backgroundColor: RGF.ink,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <View style={{ width: size * 0.4, height: size * 0.04, backgroundColor: '#fff', borderRadius: 1, marginRight: size * 0.25 }} />
      <View style={{ width: size * 0.21, height: size * 0.21, borderRadius: size * 0.21/2, backgroundColor: RGF.butter, position: 'absolute' }} />
      <View style={{ width: size * 0.4, height: size * 0.04, backgroundColor: '#fff', borderRadius: 1, marginLeft: size * 0.25 }} />
    </View>
  );
}
