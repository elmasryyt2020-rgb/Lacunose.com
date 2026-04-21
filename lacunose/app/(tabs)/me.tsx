import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../constants/theme';
import { ChipIcon, Icon, CategoryPill } from '../../components/Shared';
import { useAuth } from '../../hooks/useAuth';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useSavedGaps } from '../../hooks/useSavedGaps';
import { FRAMES } from '../../lib/fields/frames';

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

  const { session, signOut } = useAuth();
  const { data: entitlement } = useEntitlement();
  const { data: savedGaps, isLoading: loadingGaps } = useSavedGaps();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/sign-in');
    } catch (e) {
      console.error(e);
    }
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
              {session?.user?.email?.split('@')[0] || 'User'}
            </Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.muted }} numberOfLines={1}>
              {session?.user?.email || 'Loading...'}
            </Text>
          </View>
        </View>

        <Text style={{ fontFamily: RGF.sansMedium, fontSize: 11, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
          Subscription
        </Text>
        <TouchableOpacity onPress={() => router.push('/paywall')} style={{ backgroundColor: RGF.ink, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <View>
            <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: RGF.bg, textTransform: 'capitalize' }}>{entitlement?.tier || 'Free'} Plan</Text>
            <Text style={{ fontFamily: RGF.sans, fontSize: 13, color: RGF.bg, opacity: 0.6, marginTop: 2 }}>
              {entitlement?.tier === 'free' ? `${entitlement?.analysesUsed} / ${entitlement?.analysesCap} analyses used` : `Renews ${new Date(entitlement?.periodEnd || '').toLocaleDateString()}`}
            </Text>
          </View>
          <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, backgroundColor: RGF.bg }}>
            <Text style={{ fontFamily: RGF.sansMedium, fontSize: 12, color: RGF.ink }}>Manage</Text>
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
          <SettingRow icon="book" label="ORCID Integration" onPress={() => setOrgModalOpen(true)} />
          <SettingRow icon="bell" label="Notifications" onPress={() => router.push('/notifications')} />
          <SettingRow icon="mic" label="Contact Support" onPress={() => router.push('/support')} />
        </View>

        <TouchableOpacity onPress={handleSignOut} style={{ backgroundColor: '#D93E30', paddingVertical: 18, borderRadius: 24, alignItems: 'center', marginTop: 14 }}>
          <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: '#fff' }}>Sign Out</Text>
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
                <TextInput defaultValue="Seif Elmasry" style={{ fontFamily: RGF.sans, fontSize: 16, color: RGF.ink }} />
              </View>
              <View style={{ backgroundColor: RGF.surface, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: RGF.hair }}>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Email Address</Text>
                <TextInput defaultValue="seif@researcher.edu" style={{ fontFamily: RGF.sans, fontSize: 16, color: RGF.ink }} />
              </View>
              <View style={{ backgroundColor: RGF.surface, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: RGF.hair }}>
                <Text style={{ fontFamily: RGF.sansMedium, fontSize: 10, color: RGF.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Phone Number</Text>
                <TextInput defaultValue="+1 415 555 0192" keyboardType="phone-pad" style={{ fontFamily: RGF.sans, fontSize: 16, color: RGF.ink }} />
              </View>
            </View>
            <TouchableOpacity onPress={() => setEditModalOpen(false)} style={{ backgroundColor: RGF.ink, paddingVertical: 20, borderRadius: 28, alignItems: 'center', marginTop: 32 }}>
              <Text style={{ fontFamily: RGF.sansSemiBold, fontSize: 17, color: RGF.bg }}>Save Changes</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingHorizontal: 22, paddingBottom: 40 }
});
