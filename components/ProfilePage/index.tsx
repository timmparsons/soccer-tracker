import { useJuggles } from '@/hooks/useJuggles';
import { useProfile } from '@/hooks/useProfile';
import { useTeam } from '@/hooks/useTeam';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { getLevelFromXp, getRankName } from '@/lib/xp';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import XPCard from '../XPCard';
import {
  TeamOverviewCard,
  WeeklyProgressCard,
} from '../coach/CoachProfileCard';
import CoachsTip from '../common/CoachsTip';

/* --------------------------------------------------------------------------
   PROFILE HEADER
--------------------------------------------------------------------------- */
const ProfileHeader = memo(
  ({
    profile,
    team,
    onEditProfile,
  }: {
    profile: any;
    team: any;
    onEditProfile: () => void;
  }) => {
    const avatarUri =
      profile?.avatar_url ||
      'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

    const displayName =
      profile?.display_name || profile?.first_name || 'Player';

    const handleCopyCode = async () => {
      if (team?.code) {
        await Clipboard.setStringAsync(team.code);
        Alert.alert('Copied!', 'Team code copied to clipboard');
      }
    };

    return (
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarGlow} />
          <Image source={{ uri: avatarUri }} style={styles.avatar} />

          <TouchableOpacity style={styles.editIcon} onPress={onEditProfile}>
            <Ionicons name='create-outline' size={20} color='#FFF' />
          </TouchableOpacity>
        </View>

        <Text style={styles.name}>{displayName}</Text>

        {team?.name && (
          <>
            <View style={styles.teamBadge}>
              <Text style={styles.teamName}>{team.name}</Text>
            </View>

            {team?.code && (
              <TouchableOpacity
                style={styles.teamCodeContainer}
                onPress={handleCopyCode}
                activeOpacity={0.7}
              >
                <Ionicons name='key' size={16} color='#6B7280' />
                <Text style={styles.teamCodeLabel}>Team Code:</Text>
                <Text style={styles.teamCode}>{team.code}</Text>
                <Ionicons name='copy-outline' size={16} color='#2B9FFF' />
              </TouchableOpacity>
            )}
          </>
        )}

        {profile?.location && (
          <Text style={styles.location}>{profile.location}</Text>
        )}
      </View>
    );
  }
);

ProfileHeader.displayName = 'ProfileHeader';

/* --------------------------------------------------------------------------
   ACCOUNT ACTIONS
--------------------------------------------------------------------------- */
const AccountActions = memo(
  ({ onEditProfile }: { onEditProfile: () => void }) => (
    <>
      <Text style={styles.sectionTitle}>Account</Text>

      <View style={styles.actionList}>
        <TouchableOpacity style={styles.actionRow} onPress={onEditProfile}>
          <View style={styles.actionIconContainer}>
            <Ionicons name='person-outline' size={22} color='#2B9FFF' />
          </View>
          <Text style={styles.actionText}>Edit Profile</Text>
          <Ionicons name='chevron-forward' size={20} color='#9CA3AF' />
        </TouchableOpacity>
      </View>

      <CoachsTip />
    </>
  )
);

AccountActions.displayName = 'AccountActions';

/* --------------------------------------------------------------------------
   PROFILE PAGE
--------------------------------------------------------------------------- */
export default function ProfilePage() {
  const { data: user } = useUser();
  const {
    data: profile,
    isLoading: loadingProfile,
    refetch: refetchProfile,
  } = useProfile(user?.id);
  const {
    data: juggles,
    isLoading: loadingJuggles,
    refetch: refetchJuggles,
  } = useJuggles(user?.id);
  const { data: team } = useTeam(user?.id);
  const updateProfile = useUpdateProfile(user?.id);

  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Refetch profile data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchJuggles();
    }, [refetchProfile, refetchJuggles])
  );

  const totalXp = profile?.total_xp ?? 0;
  const { level, xpIntoLevel, xpForNextLevel } = getLevelFromXp(totalXp);
  const rankName = getRankName(level);

  const [modalVisible, setModalVisible] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [role, setRole] = useState<'player' | 'coach'>('player');
  const [tempAvatarUri, setTempAvatarUri] = useState<string | null>(null);

  /* ---------------- IMAGE PICK ---------------- */
  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'We need permission to access your photos'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    // Store the temporary URI to show in modal
    setTempAvatarUri(result.assets[0].uri);
  }, []);

  const openEditProfile = useCallback(() => {
    setFirstName(profile?.first_name ?? '');
    setLastName(profile?.last_name ?? '');
    setLocation(profile?.location ?? '');
    setBio(profile?.bio ?? '');
    setRole(profile?.role ?? 'player');
    setTeamCode(''); // Keep empty - they only enter if changing teams
    setTempAvatarUri(null);
    setModalVisible(true);
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    let teamId = profile?.team_id ?? null;

    if (teamCode.trim()) {
      const { data } = await supabase
        .from('teams')
        .select('id')
        .eq('code', teamCode.trim())
        .single();

      if (!data) {
        Alert.alert('Invalid team code');
        return;
      }

      teamId = data.id;
    }

    const displayName = firstName.trim()
      ? lastName.trim()
        ? `${firstName.trim()} ${lastName.trim()[0].toUpperCase()}.`
        : firstName.trim()
      : profile?.display_name || 'Player';

    // Upload avatar if changed
    let avatarUrl = profile?.avatar_url;
    if (tempAvatarUri) {
      try {
        const response = await fetch(tempAvatarUri);
        const blob = await response.blob();
        const filePath = `${user.id}/avatar.jpg`;

        await supabase.storage.from('avatars').upload(filePath, blob, {
          upsert: true,
          contentType: 'image/jpeg',
        });

        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        avatarUrl = data.publicUrl;
      } catch (error) {
        console.error('Error uploading avatar:', error);
        Alert.alert('Error', 'Failed to upload avatar');
        return;
      }
    }

    updateProfile.mutate(
      {
        first_name: firstName || null,
        last_name: lastName || null,
        display_name: displayName,
        location: location || null,
        bio: bio || null,
        role,
        team_id: teamId,
        avatar_url: avatarUrl,
      },
      {
        onSuccess: () => {
          setModalVisible(false);
          setTempAvatarUri(null);
        },
      }
    );
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loadingProfile || loadingJuggles) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#FFA500' />
      </View>
    );
  }

  const currentAvatarUri =
    tempAvatarUri ||
    profile?.avatar_url ||
    'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: 120,
          paddingTop: insets.top + 16,
        }}
      >
        <ProfileHeader
          profile={profile}
          team={team}
          onEditProfile={openEditProfile}
        />

        {profile?.is_coach ? (
          <>
            <TeamOverviewCard teamId={profile?.team_id} />
            <WeeklyProgressCard teamId={profile?.team_id} />
          </>
        ) : (
          <XPCard
            level={level}
            xpIntoLevel={xpIntoLevel}
            xpForNextLevel={xpForNextLevel}
            rankName={rankName}
            onOpenRoadmap={() => router.push('/(modals)/roadmap')}
          />
        )}

        {/* TEAM SECTION - Only show if not on a team */}
        {!profile?.team_id && (
          <View style={styles.teamSection}>
            <Text style={styles.sectionTitle}>Team</Text>
            <Text style={styles.noTeamText}>You're not on a team yet</Text>

            <View style={styles.teamButtons}>
              <TouchableOpacity
                style={styles.teamButton}
                onPress={() => router.push('/(modals)/join-team')}
              >
                <Text style={styles.teamButtonText}>Join Team</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.teamButton}
                onPress={() => router.push('/(modals)/create-team')}
              >
                <Text style={styles.teamButtonText}>Create Team</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <AccountActions onEditProfile={openEditProfile} />
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <Ionicons name='log-out-outline' size={22} color='#EF4444' />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={modalVisible} animationType='slide' transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name='close' size={28} color='#2C3E50' />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps='handled'
                showsVerticalScrollIndicator={false}
              >
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                  <Text style={styles.label}>Profile Picture</Text>
                  <View style={styles.avatarEditContainer}>
                    <Image
                      source={{ uri: currentAvatarUri }}
                      style={styles.avatarPreview}
                    />
                    <TouchableOpacity
                      style={styles.changeAvatarButton}
                      onPress={handlePickImage}
                    >
                      <Ionicons name='camera' size={20} color='#2B9FFF' />
                      <Text style={styles.changeAvatarText}>Change Photo</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder='Enter first name'
                  placeholderTextColor='#9CA3AF'
                />

                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder='Enter last name'
                  placeholderTextColor='#9CA3AF'
                />

                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder='City, State'
                  placeholderTextColor='#9CA3AF'
                />

                <Text style={styles.label}>Team Code</Text>
                <TextInput
                  style={styles.input}
                  value={teamCode}
                  onChangeText={setTeamCode}
                  placeholder='Enter team code to join'
                  placeholderTextColor='#9CA3AF'
                  autoCapitalize='characters'
                />

                {/* Add extra padding at bottom for keyboard */}
                <View style={{ height: 100 }} />
              </ScrollView>

              <View
                style={[
                  styles.modalFooter,
                  { paddingBottom: Math.max(insets.bottom, 16) },
                ]}
              >
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setModalVisible(false);
                    setTempAvatarUri(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

/* --------------------------------------------------------------------------
   STYLES
--------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F5F9FF', paddingHorizontal: 16 },

  header: { alignItems: 'center', marginBottom: 24 },
  avatarContainer: { width: 110, height: 110, marginBottom: 16 },
  avatarGlow: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 60,
    backgroundColor: '#FFA500',
    opacity: 0.3,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2B9FFF',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  name: { fontSize: 28, fontWeight: '900', color: '#2C3E50' },
  teamBadge: {
    backgroundColor: '#2B9FFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  teamName: { color: '#FFF', fontWeight: '700' },
  teamCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  teamCodeLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  teamCode: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '900',
    letterSpacing: 1,
  },
  location: { marginTop: 6, color: '#6B7280' },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 28,
    marginBottom: 12,
    color: '#2C3E50',
  },
  actionList: { backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutIcon: { backgroundColor: '#FEF2F2' },
  actionText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#2C3E50' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalHeaderTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2C3E50',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#F5F9FF',
  },

  // Avatar Edit Section
  avatarSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  avatarEditContainer: {
    alignItems: 'center',
    gap: 12,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#E5E7EB',
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2B9FFF',
  },
  changeAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2B9FFF',
  },

  label: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    color: '#2C3E50',
  },
  input: {
    backgroundColor: '#F5F9FF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  cancelButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: { fontWeight: '700', color: '#6B7280' },
  saveButton: {
    flex: 1,
    backgroundColor: '#FFA500',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: { fontWeight: '900', color: '#FFF' },
  logoutSection: {
    marginTop: 20,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 0.3,
  },
  teamSection: {
    marginTop: 28,
    marginBottom: 12,
  },
  noTeamText: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
    fontWeight: '500',
  },
  teamButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  teamButton: {
    flex: 1,
    backgroundColor: '#2B9FFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2B9FFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  teamButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
