import { useJuggles } from '@/hooks/useJuggles';
import { useProfile } from '@/hooks/useProfile';
import { useTeam } from '@/hooks/useTeam';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';

import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useMemo, useState } from 'react';
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

import { getLevelFromXp, getRankName } from '@/lib/xp';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import XPCard from '../XPCard';
import CoachsTip from '../common/CoachsTip';

/* --------------------------------------------------------------------------
   PROFILE HEADER
--------------------------------------------------------------------------- */
const ProfileHeader = memo(
  ({
    profile,
    team,
    onPickImage,
    onOpenModal,
  }: {
    profile: any;
    team: any;
    onPickImage: () => void;
    onOpenModal: () => void;
  }) => {
    const avatarUri =
      profile?.avatar_url ||
      'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

    const displayName =
      profile?.display_name ||
      profile?.first_name ||
      profile?.name ||
      profile?.username ||
      'Player';

    return (
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarGlow} />
          <TouchableOpacity onPress={onPickImage}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          </TouchableOpacity>

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
   STREAK CARD
--------------------------------------------------------------------------- */
const StreakCard = memo(
  ({ streak, bestStreak }: { streak: number; bestStreak: number }) => (
    <View style={styles.streakCard}>
      <View style={styles.streakRow}>
        <View style={styles.flameIconContainer}>
          <Ionicons name='flame' size={32} color='#FFA500' />
        </View>
        <View style={styles.streakTextBlock}>
          <Text style={styles.streakMain}>{streak}-Day Streak</Text>
          <Text style={styles.streakSub}>Best Streak: {bestStreak} days</Text>
        </View>
      </View>

      <Text style={styles.streakMessage}>Keep it going!</Text>
    </View>
  )
);

StreakCard.displayName = 'StreakCard';

/* --------------------------------------------------------------------------
   ACCOUNT ACTIONS
--------------------------------------------------------------------------- */
const AccountActions = memo(
  ({
    onOpenModal,
    onSignOut,
  }: {
    onOpenModal: () => void;
    onSignOut: () => void;
  }) => (
    <>
      <Text style={styles.sectionTitle}>Account</Text>

      <View style={styles.actionList}>
        <TouchableOpacity style={styles.actionRow} onPress={onOpenModal}>
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
const ProfilePage = () => {
  const { data: user } = useUser();
  const { data: profile, isLoading: loadingProfile } = useProfile(user?.id);
  const { data: juggles, isLoading: loadingJuggles } = useJuggles(user?.id);
  const { data: team } = useTeam(user?.id);
  const totalXp = profile?.total_xp ?? 0;
  const { level, xpIntoLevel, xpForNextLevel } = getLevelFromXp(totalXp);
  const rankName = getRankName(level);
  const router = useRouter();

  const updateProfile = useUpdateProfile(user?.id);

  const [modalVisible, setModalVisible] = useState(false);

  // form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [role, setRole] = useState<'player' | 'coach'>('player');

  /* ------------------------------------------------------------
     PICK IMAGE
  ------------------------------------------------------------- */
  const handlePickImage = useCallback(async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const ext = file.uri.split('.').pop() || 'jpg';
      const fileName = `avatar.${ext}`;
      const filePath = `${user?.id}/${fileName}`;

      const response = await fetch(file.uri);
      const blob = await response.blob();
      const buf = await new Response(blob).arrayBuffer();

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, buf, {
          contentType: file.mimeType || 'image/jpeg',
          upsert: true,
        });

      if (uploadErr) {
        console.log('[ProfilePage] upload error', uploadErr);
        Alert.alert('Upload error', uploadErr.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const url = publicUrlData.publicUrl;

      updateProfile.mutate(
        { user_id: user?.id, avatar_url: url },
        {
          onError: (err: any) => {
            console.log('[ProfilePage] avatar update error', err);
            Alert.alert('Error', err.message);
          },
        }
      );
    } catch (err: any) {
      console.log('[ProfilePage] handlePickImage error', err);
      Alert.alert('Error', err.message);
    }
  }, [updateProfile, user?.id]);

  /* ------------------------------------------------------------
     OPEN EDIT MODAL (prefill from profile)
  ------------------------------------------------------------- */
  const handleOpenModal = useCallback(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setLocation(profile.location || '');
      setBio(profile.bio || '');
      setRole((profile.role as 'player' | 'coach') || 'player');
    } else {
      setFirstName('');
      setLastName('');
      setLocation('');
      setBio('');
      setRole('player');
    }
    setTeamCode('');
    setModalVisible(true);
  }, [profile]);

  /* ------------------------------------------------------------
     SAVE PROFILE
  ------------------------------------------------------------- */
  const handleSaveProfile = () => {
    if (!user?.id) {
      console.log('[ProfilePage] ERROR: no user.id found');
      return Alert.alert(
        'Error',
        'You must be signed in to update your profile'
      );
    }

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedLocation = location.trim();
    const trimmedBio = bio.trim();
    const trimmedTeamCode = teamCode.trim();

    const displayName =
      trimmedFirst.length === 0
        ? profile?.display_name || profile?.first_name || ''
        : trimmedLast.length > 0
        ? `${trimmedFirst} ${trimmedLast[0].toUpperCase()}.`
        : trimmedFirst;

    const updates: any = {
      first_name: trimmedFirst || null,
      last_name: trimmedLast || null,
      display_name: displayName || null,
      location: trimmedLocation || null,
      bio: trimmedBio || null,
      role,
      team_code: trimmedTeamCode || null,
    };

    if (trimmedTeamCode.length > 0) {
      updates.team_code = trimmedTeamCode;
    }

    updateProfile.mutate(updates, {
      onSuccess: () => {
        setModalVisible(false);
      },
      onError: (err: any) => {
        console.log('[ProfilePage] update error', err);
        Alert.alert('Error', err.message);
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  /* ------------------------------------------------------------
     STATS
  ------------------------------------------------------------- */
  const stats = useMemo(
    () => ({
      level: juggles?.level ?? 1,
      xp: juggles?.xp_earned ?? 0,
      streak: juggles?.streak_days ?? 0,
      bestStreak: juggles?.best_daily_streak ?? 0,
    }),
    [juggles]
  );

  if (loadingProfile || loadingJuggles) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#FFA500' />
      </View>
    );
  }

  /* ============================================================
     PAGE UI
  ============================================================ */
  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <ProfileHeader
          profile={profile}
          team={team}
          onPickImage={handlePickImage}
          onOpenModal={handleOpenModal}
        />
        <XPCard
          level={level}
          xpIntoLevel={xpIntoLevel}
          xpForNextLevel={xpForNextLevel}
          rankName={rankName}
          onOpenRoadmap={() => router.push('/(modals)/roadmap')}
        />
        <StreakCard streak={stats.streak} bestStreak={stats.bestStreak} />
        <AccountActions
          onOpenModal={handleOpenModal}
          onSignOut={handleSignOut}
        />
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={modalVisible} animationType='slide' transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, justifyContent: 'flex-end' }}
            keyboardVerticalOffset={80}
          >
            <View style={styles.modalContent}>
              {/* HEADER */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name='close' size={28} color='#2C3E50' />
                </TouchableOpacity>
              </View>

              {/* BODY */}
              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: 30 }}
                keyboardShouldPersistTaps='handled'
              >
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder='Enter your first name'
                  placeholderTextColor='#9CA3AF'
                />

                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder='Enter your last name (optional)'
                  placeholderTextColor='#9CA3AF'
                />

                <Text style={styles.label}>Are you a...</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      role === 'player' && styles.roleButtonActive,
                    ]}
                    onPress={() => setRole('player')}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === 'player' && styles.roleButtonTextActive,
                      ]}
                    >
                      Player
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      role === 'coach' && styles.roleButtonActive,
                    ]}
                    onPress={() => setRole('coach')}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === 'coach' && styles.roleButtonTextActive,
                      ]}
                    >
                      Coach
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder='City, State or Country'
                  placeholderTextColor='#9CA3AF'
                />

                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder='Tell us about yourself...'
                  placeholderTextColor='#9CA3AF'
                  multiline
                />

                <Text style={styles.label}>Team Code</Text>
                <TextInput
                  style={styles.input}
                  value={teamCode}
                  onChangeText={setTeamCode}
                  placeholder='Enter team code to join'
                  placeholderTextColor='#9CA3AF'
                  autoCapitalize='none'
                />

                <Text style={styles.currentTeamLabel}>
                  {team?.name
                    ? `Current Team: ${team.name}`
                    : 'Not on a team yet'}
                </Text>
              </ScrollView>

              {/* FOOTER BUTTONS */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <ActivityIndicator color='#fff' />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

export default ProfilePage;

/* -----------------------------------------------------------
   STYLES
------------------------------------------------------------ */
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
    paddingHorizontal: 16,
  },

  // HEADER
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
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
    borderRadius: 50,
    padding: 8,
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#2B9FFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 8,
  },
  teamBadge: {
    backgroundColor: '#2B9FFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  location: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },

  // STREAK CARD
  streakCard: {
    backgroundColor: '#2C3E50',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  flameIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakTextBlock: {
    marginLeft: 16,
    flex: 1,
  },
  streakMain: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  streakSub: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
  streakMessage: {
    color: '#FFA500',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },

  // ACCOUNT ACTIONS
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C3E50',
    marginTop: 28,
    marginBottom: 12,
  },
  actionList: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
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

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 62, 80, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#2B9FFF',
    backgroundColor: '#F5F9FF',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2C3E50',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F9FF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '500',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
    textAlignVertical: 'top',
  },

  currentTeamLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F5F9FF',
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
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FFA500',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 16,
  },

  roleButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  roleButtonActive: {
    backgroundColor: '#2B9FFF',
    borderColor: '#2B9FFF',
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  roleButtonTextActive: {
    color: '#FFF',
  },
});
