import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, Linking, Platform, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../constants/theme';
import { ChipIcon, Icon, CategoryPill } from '../../components/Shared';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useSavedGaps } from '../../hooks/useSavedGaps';
import { FRAMES } from '../../lib/fields/frames';
import { restorePurchases } from '../../lib/billing/revenuecat';
import { fetchApi } from '../../lib/api/client';
import { isMockMode } from '../../lib/mocks';

const ANALYTICS_OPT_OUT_KEY = 'lacunose:analytics-opt-out';

function SettingRow({ icon, label, destructive, onPress }: any) {
  const { RGF } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1} style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: RGF.hair,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon name={icon} size={18} color={destructive ? RGF.rose : RGF.ink} />
        <Text style={{ fontFamily: RGF.sansMedium, fontSize: 15, color: destructive ? RGF.rose : RGF.ink }}>{label}</Text>
      </View>
      <Icon name="chevR" size={14} color={RGF.muted} />
    </TouchableOpacity>
  );
}

export default function ScreenMe() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { RGF, theme, setMode } = useTheme();
  
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  const [isOrgModalOpen, setOrgModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [analyticsOptOut, setAnalyticsOptOut] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { session, user, signOut } = useAuth();
  const { data: entitlement } = useEntitlement();
  const { data: savedGaps, isLoading: loadingGaps } = useSavedGaps();

  // Display-ready name from user_metadata, falling back to email prefix.
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const displayName = String(
    (meta.full_name as string | undefined)
      ?? (meta.name as string | undefined)
      ?? user?.email?.split('@')[0]
      ?? 'User'
  );
  const displayEmail = user?.email ?? '';
  const initialPhone = String((meta.phone as string | undefined) ?? '');

  // Edit profile form state
  const [editName, setEditName] = useState(displayName);
  const [editPhone, setEditPhone] = useState(initialPhone);
  const [savingProfile, setSavingProfile] = useState(false);

  // Reset edit form values every time the modal opens (so cancel works).
  React.useEffect(() => {
    if (isEditModalOpen) {
      setEditName(displayName);
      setEditPhone(initialPhone);
    }
  }, [isEditModalOpen, displayName, initialPhone]);

  const saveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      const trimmedPhone = editPhone.trim();
      // Loose international-format check: optional +, 7-15 digits, spaces/dashes ok.
      if (trimmedPhone && !/^\+?[0-9][\d\s\-]{6,20}$/.test(trimmedPhone)) {
        Alert.alert('Check your phone number', 'Use international format, e.g. +20 123 456 7890.');
        return;
      }
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: editName.trim() || displayName,
          phone: trimmedPhone,
        },
      });
      if (error) throw error;
      setEditModalOpen(false);
    } catch (e) {
      Alert.alert('Could not save', (e as Error)?.message ?? 'Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Load analytics opt-out preference.
  React.useEffect(() => {
    AsyncStorage.getItem(ANALYTICS_OPT_OUT_KEY).then(v => {
      setAnalyticsOptOut(v === '1');
    });
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (e) {
      Alert.alert('Sign out failed', (e as Error)?.message ?? 'Unknown error');
    }
  };

  const handleRestore = async () => {
    try {
      const info = await restorePurchases();
      queryClient.invalidateQueries({ queryKey: ['entitlement'] });
      Alert.alert(
        info && Object.keys(info.entitlements.active).length > 0
          ? 'Purchases restored'
          : 'No purchases to restore',
      );
    } catch (e) {
      Alert.alert('Restore failed', (e as Error)?.message ?? 'Unknown error');
    }
  };

  const handleManageSubscription = () => {
    const url = Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url).catch(() => Alert.alert('Could not open subscription settings.'));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      Alert.alert('Type DELETE to confirm');
      return;
    }
    try {
      if (!isMockMode) {
        await fetchApi('/v1/account/delete', { method: 'POST' });
      }
      await signOut();
      setDeleteModalOpen(false);
      router.replace('/sign-in');
    } catch (e) {
      Alert.alert('Delete failed', (e as Error)?.message ?? 'Unknown error');
    }
  };

  const toggleAnalyticsOptOut = async (value: boolean) => {
    setAnalyticsOptOut(value);
    await AsyncStorage.setItem(ANALYTICS_OPT_OUT_KEY, value ? '1' : '0');
  };

  return (
    <View style={[styles.container, { backgroundColor: RGF.bg }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <Text style={{ fontFamily: RGF.display, fontSize: 40, lineHeight: 41, letterSpacing: -1.2, color: RGF.ink }}>
            Profile
          </Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setMode(theme === 'dark' ? 'light' : 'dark')}>
            <ChipIcon name="settings" size={40} iconSize={16} bg={RGF.surface} />
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: RGF.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: RGF.hair, marginBottom: 32, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: RGF.butter, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: RGF.display, fontSize: 28, color: '#111' }}>
              {(session?.user?.email || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: RGF.display, fontSize: 24, letterSpacing: -0.5, color: RGF.ink }} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }} numberOfLines={1}>
              {displayEmail || 'Loading...'}
            </Text>
          </View>
        </View>

        <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
          Subscription
        </Text>
        <TouchableOpacity
          onPress={() => (entitlement?.tier === 'free' ? router.push('/paywall') : handleManageSubscription())}
          style={{ backgroundColor: RGF.ink, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}
        >
          <View>
            <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: RGF.bg, textTransform: 'capitalize' }}>
              {entitlement?.tier || 'Free'} Plan
            </Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.bg, opacity: 0.6, marginTop: 2 }}>
              {entitlement?.tier === 'free'
                ? `${entitlement?.analysesUsed ?? 0} / ${entitlement?.analysesCap ?? 3} analyses used`
                : entitlement?.periodEnd
                ? `Renews ${new Date(entitlement.periodEnd).toLocaleDateString()}`
                : 'Active'}
            </Text>
          </View>
          <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: RGF.bg }}>
            <Text style={{ fontFamily: RGF.sansMedium, fontSize: 12, color: RGF.ink }}>
              {entitlement?.tier === 'free' ? 'Upgrade' : 'Manage'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Saved Gaps
          </Text>
          <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>{savedGaps?.length || 0} total</Text>
        </View>
        
        <View style={{ gap: 10, marginBottom: 32 }}>
          {loadingGaps && <Text style={{ fontFamily: RGF.sans, color: RGF.muted }}>Loading...</Text>}
          {!loadingGaps && savedGaps?.length === 0 && <Text style={{ fontFamily: RGF.sans, color: RGF.muted }}>No saved gaps yet</Text>}
          {savedGaps?.map((gap: any, i: number) => (
            <TouchableOpacity key={gap.id || i} onPress={() => router.push(`/analyze/detail?gapId=${gap.id}`)} style={{ backgroundColor: RGF.surface, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: RGF.hair, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: (RGF as any)[FRAMES[gap.field || 'medicine']?.rows[0]?.color || 'lavender'] || RGF.lavender, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bookmark" size={16} color={RGF.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <CategoryPill kind={gap.category || 'future-work'} />
                <Text style={{ fontFamily: RGF.display, fontSize: 18, lineHeight: 21, letterSpacing: -0.3, color: RGF.ink, marginTop: 6 }} numberOfLines={2}>
                  {gap.title}
                </Text>
              </View>
              <Icon name="chevR" size={16} color={RGF.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ backgroundColor: RGF.surface, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 4, borderWidth: 1, borderColor: RGF.hair }}>
          <SettingRow icon="person" label="Edit Profile" onPress={() => setEditModalOpen(true)} />
          <SettingRow icon="lock" label="Change Password" onPress={() => setPasswordModalOpen(true)} />
          {/* ORCID integration — hidden for hackathon; re-enable once real OAuth is wired. */}
          {/* <SettingRow icon="book" label="ORCID Integration" onPress={() => setOrgModalOpen(true)} /> */}
          <SettingRow icon="bell" label="Notifications" onPress={() => router.push('/notifications')} />
          <SettingRow icon="mail" label="Contact Support" onPress={() => router.push('/support')} />
          <SettingRow icon="bookmark" label="Restore Purchases" onPress={handleRestore} />
          <SettingRow icon="chart" label="Analytics preferences" onPress={() => setAnalyticsModalOpen(true)} />
        </View>

        <TouchableOpacity onPress={handleSignOut} style={{ backgroundColor: RGF.ink, paddingVertical: 18, borderRadius: 24, alignItems: 'center', marginTop: 14 }}>
          <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: RGF.bg }}>Sign out</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDeleteModalOpen(true)}
          style={{ paddingVertical: 18, borderRadius: 24, alignItems: 'center', marginTop: 10 }}
        >
          <Text style={{ fontFamily: RGF.sansMedium, fontSize: 14, color: '#D93E30' }}>
            Delete account
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: RGF.bg, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 26, paddingBottom: Math.max(40, insets.bottom + 20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 26, color: RGF.ink }}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: RGF.hair, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={RGF.ink} />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 16 }}>
              <View style={{ backgroundColor: RGF.surface, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: RGF.hair }}>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Full Name</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your name"
                  placeholderTextColor={RGF.muted}
                  style={{ fontFamily: RGF.sans, fontSize: 16, color: RGF.ink, padding: 0 }}
                />
              </View>
              <View style={{ backgroundColor: RGF.surface, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: RGF.hair }}>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Email Address</Text>
                <TextInput value={displayEmail} style={{ fontFamily: RGF.sans, fontSize: 16, color: RGF.ink, padding: 0 }} editable={false} />
              </View>
              <View style={{ backgroundColor: RGF.surface, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: RGF.hair }}>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Phone</Text>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+20 123 456 7890"
                  placeholderTextColor={RGF.muted}
                  keyboardType="phone-pad"
                  style={{ fontFamily: RGF.sans, fontSize: 16, color: RGF.ink, padding: 0 }}
                />
                <Text style={{ fontFamily: RGF.sans, fontSize: 11, color: RGF.muted, marginTop: 4 }}>
                  Used to contact you about your account. See Privacy Policy.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={saveProfile}
              disabled={savingProfile}
              activeOpacity={0.8}
              style={{ backgroundColor: RGF.ink, paddingVertical: 20, borderRadius: 28, alignItems: 'center', marginTop: 32, opacity: savingProfile ? 0.6 : 1 }}>
              <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: RGF.bg }}>
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={isPasswordModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: RGF.bg, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 26, paddingBottom: Math.max(40, insets.bottom + 20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 26, color: RGF.ink }}>Change Password</Text>
              <TouchableOpacity onPress={() => setPasswordModalOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: RGF.hair, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={RGF.ink} />
              </TouchableOpacity>
            </View>
            <View style={{ gap: 16 }}>
              <View style={{ backgroundColor: RGF.surface, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: RGF.hair }}>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Current Password</Text>
                <TextInput secureTextEntry placeholder="••••••••" placeholderTextColor={RGF.muted} style={{ fontFamily: RGF.sans, fontSize: 16, color: RGF.ink }} />
              </View>
              <View style={{ backgroundColor: RGF.surface, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: RGF.hair }}>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>New Password</Text>
                <TextInput secureTextEntry placeholder="••••••••" placeholderTextColor={RGF.muted} style={{ fontFamily: RGF.sans, fontSize: 16, color: RGF.ink }} />
              </View>
              <View style={{ backgroundColor: RGF.surface, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: RGF.hair }}>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Confirm New Password</Text>
                <TextInput secureTextEntry placeholder="••••••••" placeholderTextColor={RGF.muted} style={{ fontFamily: RGF.sans, fontSize: 16, color: RGF.ink }} />
              </View>
            </View>
            <TouchableOpacity onPress={() => setPasswordModalOpen(false)} style={{ backgroundColor: RGF.ink, paddingVertical: 20, borderRadius: 28, alignItems: 'center', marginTop: 32 }}>
              <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: RGF.bg }}>Update Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ORCID Modal */}
      <Modal visible={isOrgModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: RGF.bg, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 26, paddingBottom: Math.max(40, insets.bottom + 20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 26, color: RGF.ink }}>ORCID Integration</Text>
              <TouchableOpacity onPress={() => setOrgModalOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: RGF.hair, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={RGF.ink} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: RGF.sans, fontSize: 14, color: RGF.inkSoft, marginBottom: 24, lineHeight: 20 }}>
              Verify your identity by connecting your Open Researcher and Contributor ID to Lacunose.
            </Text>
            
            <TouchableOpacity onPress={() => {}} activeOpacity={0.8} style={{ backgroundColor: RGF.surface, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: RGF.hair, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#A6CE39', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="link" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 15, color: RGF.ink }}>Connect ORCID</Text>
                <Text style={{ fontFamily: RGF.sans, fontSize: 12, color: RGF.muted }}>16-digit researcher ID</Text>
              </View>
              <Icon name="chevR" size={16} color={RGF.muted} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setOrgModalOpen(false)} style={{ backgroundColor: RGF.ink, paddingVertical: 20, borderRadius: 28, alignItems: 'center', marginTop: 32 }}>
              <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: RGF.bg }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Analytics preferences */}
      <Modal visible={isAnalyticsModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: RGF.bg, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 26, paddingBottom: Math.max(40, insets.bottom + 20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 26, color: RGF.ink }}>Analytics</Text>
              <TouchableOpacity onPress={() => setAnalyticsModalOpen(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: RGF.hair, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={RGF.ink} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: RGF.sans, fontSize: 14, color: RGF.inkSoft, lineHeight: 20, marginBottom: 18 }}>
              Lacunose collects anonymized usage to improve gap quality. You can opt out at any time — it only affects this device.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: RGF.surface, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18, borderWidth: 1, borderColor: RGF.hair }}>
              <Text style={{ fontFamily: RGF.sansMedium, fontSize: 15, color: RGF.ink }}>Opt out of usage analytics</Text>
              <Switch value={analyticsOptOut} onValueChange={toggleAnalyticsOptOut} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete account */}
      <Modal visible={isDeleteModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: RGF.bg, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 26, paddingBottom: Math.max(40, insets.bottom + 20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <Text style={{ fontFamily: RGF.display, fontSize: 26, color: '#D93E30' }}>Delete account</Text>
              <TouchableOpacity onPress={() => { setDeleteModalOpen(false); setDeleteConfirm(''); }} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: RGF.hair, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={RGF.ink} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontFamily: RGF.sans, fontSize: 14, color: RGF.inkSoft, lineHeight: 20, marginBottom: 14 }}>
              This permanently deletes your account, all analyses, all saved gaps, and any active subscription data on our servers. This cannot be undone.
            </Text>
            <Text style={{ fontFamily: RGF.sansMedium, fontSize: 12, color: RGF.muted, marginBottom: 8, letterSpacing: 1.2, textTransform: 'uppercase' }}>Type DELETE to confirm</Text>
            <View style={{ backgroundColor: RGF.surface, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: RGF.hair, marginBottom: 16 }}>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="DELETE"
                placeholderTextColor={RGF.muted}
                value={deleteConfirm}
                onChangeText={setDeleteConfirm}
                style={{ fontFamily: RGF.mono, fontSize: 16, color: RGF.ink }}
              />
            </View>
            <TouchableOpacity
              onPress={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE'}
              style={{
                backgroundColor: '#D93E30',
                paddingVertical: 18, borderRadius: 24, alignItems: 'center',
                opacity: deleteConfirm === 'DELETE' ? 1 : 0.4,
              }}
            >
              <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 16, color: '#fff' }}>
                Permanently delete my account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingHorizontal: 22, paddingBottom: 40 }
});
