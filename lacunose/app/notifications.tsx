import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../constants/theme';
import { useEffect, useRef } from 'react';
import { ChipIcon, Icon } from '../components/Shared';
import { useNotifications } from '../hooks/useNotifications';

function NotificationItem({ title, message, time, icon, color, isNew }: any) {
  const { RGF } = useTheme();
  return (
    <TouchableOpacity activeOpacity={0.7} style={[
      styles.itemBox,
      isNew && { backgroundColor: RGF.surface, borderColor: RGF.hair, borderWidth: 1 }
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
  const { RGF, theme } = useTheme();

  const { data: notifications, isLoading, markAllRead } = useNotifications();

  // Keep a ref to the latest markAllRead so the unmount cleanup always calls
  // the current reference without re-running on every render.
  const markRef = useRef(markAllRead);
  markRef.current = markAllRead;

  useEffect(() => {
    // Fire exactly once when the screen unmounts.
    return () => {
      try { markRef.current?.(); } catch {}
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: RGF.bg }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 60), borderBottomColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChipIcon name="chevL" size={40} iconSize={14} bg={RGF.surface} />
        </TouchableOpacity>
        <Text style={{ fontFamily: RGF.display, fontSize: 24, letterSpacing: -0.5, color: RGF.ink }}>
          Notifications
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {isLoading && <Text style={{ fontFamily: RGF.sans, color: RGF.muted, textAlign: 'center' }}>Loading...</Text>}
        {notifications?.map((item: any, i: number) => (
          <NotificationItem 
            key={item.id || i} 
            title={item.title} 
            message={item.body} 
            time={new Date(item.created_at).toLocaleDateString()} 
            icon={item.kind === 'analysis_done' ? 'sparkle' : 'gap'} 
            color={RGF.lavender} 
            isNew={!item.is_read} 
          />
        ))}
        
        <TouchableOpacity onPress={() => markAllRead()} style={{ alignSelf: 'center', marginTop: 20 }}>
          <Text style={{ fontFamily: RGF.sansMedium, fontSize: 13, color: RGF.muted }}>Mark all as read</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 22, paddingBottom: 20,
    borderBottomWidth: 1
  },
  scrollContent: {
    paddingTop: 20, paddingHorizontal: 22,
  },
  itemBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 20, marginBottom: 8,
  }
});
