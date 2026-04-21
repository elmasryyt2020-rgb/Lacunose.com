import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { RGF } from '../constants/theme';
import { ChipIcon, Icon } from '../components/Shared';

function NotificationItem({ title, message, time, icon, color, isNew }: any) {
  return (
    <TouchableOpacity activeOpacity={0.7} style={[
      styles.itemBox,
      isNew && { backgroundColor: '#fff', borderColor: RGF.hair, borderWidth: 1 }
    ]}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={RGF.ink} />
      </View>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 15, color: RGF.ink, letterSpacing: -0.2, marginBottom: 2 }}>{title}</Text>
        <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.inkSoft, lineHeight: 18 }} numberOfLines={2}>{message}</Text>
        <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, marginTop: 6, textTransform: 'uppercase' }}>{time}</Text>
      </View>
      {isNew ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#E55B3C', alignSelf: 'flex-start', marginTop: 6 }} /> : null}
    </TouchableOpacity>
  );
}

export default function ScreenNotifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const data = [
    { 
      title: 'Synthesis complete', 
      message: 'Your gap analysis for "Solid tumors" has finished. 12 novel spaces identified.',
      time: '1h ago', icon: 'sparkle', color: RGF.lavender, isNew: true 
    },
    { 
      title: 'Free tier unlocked', 
      message: 'Your 3 free monthly analyses have been reset today. Go find your next gap!',
      time: '4h ago', icon: 'clock', color: RGF.mint, isNew: true 
    },
    { 
      title: 'PICO Framework Update', 
      message: 'We added more detailed methodologies regarding pediatric cohorts.',
      time: 'Yesterday', icon: 'flask', color: RGF.butter, isNew: false 
    },
    { 
      title: 'Welcome to Lacunose', 
      message: 'Thank you for joining. Discover areas the literature left behind.',
      time: '3d ago', icon: 'gap', color: RGF.sky, isNew: false 
    }
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 60) }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChipIcon name="chevL" size={40} iconSize={14} />
        </TouchableOpacity>
        <Text style={{ fontFamily: RGF.display, fontSize: 24, letterSpacing: -0.5, color: RGF.ink }}>
          Notifications
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {data.map((item, i) => (
          <NotificationItem key={i} {...item} />
        ))}
        
        <TouchableOpacity style={{ alignSelf: 'center', marginTop: 20 }}>
          <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: RGF.muted }}>Mark all as read</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: RGF.bg,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 22, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)'
  },
  scrollContent: {
    paddingTop: 20, paddingHorizontal: 22,
  },
  itemBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 20, marginBottom: 8,
  }
});
