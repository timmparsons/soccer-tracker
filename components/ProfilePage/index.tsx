import { useJuggles } from '@/hooks/useJuggles';
import { useProfile } from '@/hooks/useProfile';
import { useTeam } from '@/hooks/useTeam';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { getLevelFromXp, getRankName } from '@/lib/xp';

import { Ionicons } from '@expo/vector-icons';
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
import CoachsTip from '../common/CoachsTip';

/* --------------------------------------------------------------------------
   PROFILE HEADER
--------------------------------------------------------------------------- */
const ProfileHeader = memo(
  ({
    profile,
    team,
    onOpenModal,
  }: {
    profile: any;
    team: any;
    onOpenModal: () => void;
  }) => {
    const avatarUri =
      profile?.avatar_url ||
      'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

    const displayName =
      profile?.display_name || profile?.first_name || 'Player';

    return (
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarGlow} />
          <Image source={{ uri: avatarUri }} style={styles.avatar} />

          <TouchableOpacity style={styles.editIcon} onPress={onOpenModal}>
            <Ionicons name='settings-sharp' size={20} color='#FFF' />
          </TouchableOpacity>
        </View>

        <Text style={styles.name}>{displayName}</Text>

        {team?.name && (
          <View style={styles.teamBadge}>
            <Text style={styles.teamName}>{team.name}</Text>
          </View>
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
  ({
    onEditProfile,
    onSignOut,
  }: {
    onEditProfile: () => void;
    onSignOut: () => void;
  }) => (
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

        <TouchableOpacity style={styles.actionRow} onPress={onSignOut}>
          <View style={[styles.actionIconContainer, styles.logoutIcon]}>
            <Ionicons name='log-out-outline' size={22} color='#EF4444' />
          </View>
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Log Out</Text>
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
  const { data: profile, isLoading: loadingProfile } = useProfile(user?.id);
  const { data: juggles, isLoading: loadingJuggles } = useJuggles(user?.id);
  const { data: team } = useTeam(user?.id);
  const updateProfile = useUpdateProfile(user?.id);

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const totalXp = profile?.total_xp ?? 0;
  const { level, xpIntoLevel, xpForNextLevel } = getLevelFromXp(totalXp);
  const rankName = getRankName(level);

  const [modalVisible, setModalVisible] = useState(false);

  // form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [role, setRole] = useState<'player' | 'coach'>('player');

  const handleOpenModal = useCallback(() => {
    setFirstName(profile?.first_name ?? '');
    setLastName(profile?.last_name ?? '');
    setLocation(profile?.location ?? '');
    setBio(profile?.bio ?? '');
    setRole(profile?.role ?? 'player');
    setTeamCode('');
    setModalVisible(true);
  }, [profile]);

  const handleSaveProfile = async () => {
    try {
      let teamId = profile?.team_id ?? null;

      if (teamCode.trim()) {
        const { data, error } = await supabase
          .from('teams')
          .select('id')
          .eq('code', teamCode.trim())
          .single();

        if (error || !data) {
          Alert.alert('Invalid team code');
          return;
        }

        teamId = data.id;
      }

      const displayName =
        firstName.trim().length > 0
          ? lastName.trim()
            ? `${firstName.trim()} ${lastName.trim()[0].toUpperCase()}.`
            : firstName.trim()
          : profile?.display_name || 'Player';

      updateProfile.mutate(
        {
          first_name: firstName || null,
          last_name: lastName || null,
          display_name: displayName,
          location: location || null,
          bio: bio || null,
          role,
          team_id: teamId,
        },
        {
          onSuccess: () => setModalVisible(false),
          onError: (err: any) =>
            Alert.alert('Error', err.message ?? 'Update failed'),
        }
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
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
          onOpenModal={handleOpenModal}
        />

        <XPCard
          level={level}
          xpIntoLevel={xpIntoLevel}
          xpForNextLevel={xpForNextLevel}
          rankName={rankName}
          onOpenRoadmap={() => router.push('/(modals)/roadmap')}
        />

        <AccountActions
          onEditProfile={handleOpenModal}
          onSignOut={handleSignOut}
        />
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={modalVisible} animationType='slide' transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <View style={styles.modalContent}>
              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps='handled'
              >
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                />

                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                />

                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                />

                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                />

                <Text style={styles.label}>Team Code</Text>
                <TextInput
                  style={styles.input}
                  value={teamCode}
                  onChangeText={setTeamCode}
                  autoCapitalize='none'
                />
              </ScrollView>

              <View
                style={[
                  styles.modalFooter,
                  { paddingBottom: Math.max(insets.bottom, 16) },
                ]}
              >
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
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
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

/* --------------------------------------------------------------------------
   STYLES
--------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
    paddingHorizontal: 16,
  },

  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  name: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2C3E50',
  },
  teamBadge: {
    backgroundColor: '#2B9FFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  teamName: {
    color: '#FFF',
    fontWeight: '700',
  },
  location: {
    marginTop: 6,
    color: '#6B7280',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 28,
    marginBottom: 12,
    color: '#2C3E50',
  },

  actionList: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
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
  logoutIcon: {
    backgroundColor: '#FEF2F2',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },

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
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#F5F9FF',
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  cancelButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '700',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FFA500',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontWeight: '900',
    color: '#FFF',
  },
});
