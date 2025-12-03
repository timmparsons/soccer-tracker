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

import Heatmap from '@/components/Heatmap';
import { getLevelFromXp, getRankName } from '@/lib/xp';
import * as ImagePicker from 'expo-image-picker';
import XPCard from '../XPCard';

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
          <TouchableOpacity onPress={onPickImage}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.editIcon} onPress={onOpenModal}>
            <Ionicons name='settings-sharp' size={20} color='#fff' />
          </TouchableOpacity>
        </View>

        <Text style={styles.name}>{displayName}</Text>

        {team?.name && <Text style={styles.teamName}>Team: {team.name}</Text>}

        {profile?.location && (
          <Text style={styles.location}>📍 {profile.location}</Text>
        )}
      </View>
    );
  }
);

ProfileHeader.displayName = 'ProfileHeader';

/* --------------------------------------------------------------------------
   RANK CARD
--------------------------------------------------------------------------- */
const RankCard = memo(({ level, xp }: { level: number; xp: number }) => {
  const xpNeeded = 1000;
  const pct = Math.min((xp / xpNeeded) * 100, 100);

  return (
    <View style={styles.rankCard}>
      <View style={styles.rankHeader}>
        <Text style={styles.rankTitle}>Level {level}</Text>
        <Text style={styles.rankSubtitle}>
          {level >= 10 ? 'Elite Rank 🏆' : 'Bronze Rank 🥉'}
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>

      <Text style={styles.rankText}>
        {xp} / {xpNeeded} XP
      </Text>
    </View>
  );
});

RankCard.displayName = 'RankCard';

/* --------------------------------------------------------------------------
   STREAK CARD
--------------------------------------------------------------------------- */
const StreakCard = memo(
  ({ streak, bestStreak }: { streak: number; bestStreak: number }) => (
    <View style={styles.streakCard}>
      <View style={styles.streakRow}>
        <Ionicons name='flame' size={28} color='#f59e0b' />
        <View style={styles.streakTextBlock}>
          <Text style={styles.streakMain}>{streak}-Day Streak</Text>
          <Text style={styles.streakSub}>
            Longest Streak: {bestStreak} days
          </Text>
        </View>
      </View>

      <Text style={styles.streakMessage}>Keep the fire going! 🔥</Text>
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
          <Ionicons name='person-outline' size={22} color='#3b82f6' />
          <Text style={styles.actionText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={onSignOut}>
          <Ionicons name='log-out-outline' size={22} color='#ef4444' />
          <Text style={[styles.actionText, { color: '#ef4444' }]}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Coach's Tip 💬</Text>
        <Text style={styles.tipText}>
          "Show up every day — consistency beats intensity."
        </Text>
      </View>
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

  const updateProfile = useUpdateProfile(user?.id);

  const [modalVisible, setModalVisible] = useState(false);

  // form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [role, setRole] = useState<'player' | 'coach'>('player');
  console.log('QQQ ', location);
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
    console.log('UPDATING PROFILE WITH:', updates);
    console.log('[ProfilePage] handleSaveProfile →', updates);

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
        <ActivityIndicator size='large' color='#3b82f6' />
      </View>
    );
  }

  /* ============================================================
     PAGE UI
  ============================================================ */
  console.log('XXX RENDER ProfilePage with profile:', profile);
  return (
    <>
      <ScrollView style={styles.container}>
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
        />
        <StreakCard streak={stats.streak} bestStreak={stats.bestStreak} />
        <Heatmap stats={juggles} />
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
                  <Ionicons name='close' size={28} color='#111827' />
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
                />

                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder='Enter your last name (optional)'
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
                />

                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder='Tell us about yourself...'
                  multiline
                />

                <Text style={styles.label}>Team Code</Text>
                <TextInput
                  style={styles.input}
                  value={teamCode}
                  onChangeText={setTeamCode}
                  placeholder='Enter team code to join'
                  autoCapitalize='none'
                />

                <Text style={styles.currentTeamLabel}>
                  {team?.name ? `Current Team: ${team.name}` : 'Not on a team'}
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
                    <Text style={styles.saveButtonText}>Save</Text>
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
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
  },

  header: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    borderRadius: 50,
    padding: 6,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  teamName: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
  },
  location: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 4,
  },

  rankCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rankHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  rankTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  rankSubtitle: { fontSize: 15, color: '#6b7280' },
  progressBar: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  rankText: {
    marginTop: 6,
    textAlign: 'right',
    color: '#6b7280',
    fontSize: 13,
  },

  streakCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakTextBlock: { marginLeft: 12 },
  streakMain: { fontSize: 17, fontWeight: '700', color: '#111827' },
  streakSub: { fontSize: 13, color: '#6b7280' },
  streakMessage: {
    marginTop: 8,
    color: '#3b82f6',
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
  },
  actionList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  actionText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },

  tipCard: {
    backgroundColor: '#e0f2fe',
    padding: 16,
    borderRadius: 16,
    marginVertical: 24,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    color: '#0369a1',
  },
  tipText: {
    fontSize: 14,
    color: '#075985',
    lineHeight: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },

  currentTeamLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#374151',
  },

  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '600',
    color: '#374151',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  roleButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#3b82f6',
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
});
