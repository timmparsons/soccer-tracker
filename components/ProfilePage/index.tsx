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
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Heatmap from '@/components/Heatmap';
import * as ImagePicker from 'expo-image-picker';

// Memoized components
const ProfileHeader = memo(
  ({ profile, team, onPickImage, onOpenModal }: any) => {
    // Add cache busting to avatar URL
    const avatarUri = profile?.avatar_url
      ? `${profile.avatar_url}${
          profile.avatar_url.includes('?') ? '&' : '?'
        }t=${Date.now()}`
      : 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

    return (
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={onPickImage}>
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatar}
              key={avatarUri}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.editIcon} onPress={onOpenModal}>
            <Ionicons name='settings-sharp' size={20} color='#fff' />
          </TouchableOpacity>
        </View>

        <Text style={styles.name}>
          {profile?.name || profile?.username || 'User'}
        </Text>
        <Text style={styles.tagline}>
          {profile?.bio || 'Future Juggling Pro ⚽'}
        </Text>

        {team?.name && <Text style={styles.teamName}>Team: {team.name}</Text>}

        {profile?.location && (
          <Text style={styles.location}>📍 {profile.location}</Text>
        )}
      </View>
    );
  }
);

ProfileHeader.displayName = 'ProfileHeader';

const RankCard = memo(({ level, xp }: { level: number; xp: number }) => {
  const xpNeeded = 1000;
  const xpPercent = Math.min((xp / xpNeeded) * 100, 100);

  return (
    <View style={styles.rankCard}>
      <View style={styles.rankHeader}>
        <Text style={styles.rankTitle}>Level {level}</Text>
        <Text style={styles.rankSubtitle}>
          {level >= 10 ? 'Elite Rank 🏆' : 'Bronze Rank 🥉'}
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${xpPercent}%` }]} />
      </View>

      <Text style={styles.rankText}>
        {xp} / {xpNeeded} XP
      </Text>
    </View>
  );
});

RankCard.displayName = 'RankCard';

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

const AccountActions = memo(({ onOpenModal, onSignOut }: any) => (
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
));

AccountActions.displayName = 'AccountActions';

const ProfilePage = () => {
  const { data: user } = useUser();
  const { data: profile, isLoading: loadingProfile } = useProfile(user?.id);
  const { data: juggles, isLoading: loadingJuggles } = useJuggles(user?.id);
  const { data: team } = useTeam(user?.id);
  console.log('QQQ ', team.name);

  const updateProfile = useUpdateProfile(user?.id);

  const [modalVisible, setModalVisible] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [teamCode, setTeamCode] = useState('');

  // Pick + Upload Avatar
  const handlePickImage = useCallback(async () => {
    try {
      // Request permissions first
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos');
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

      // Convert image to blob for React Native
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      // Upload file
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: file.mimeType || 'image/jpeg',
          upsert: true,
        });

      if (uploadErr) {
        console.error('Upload error:', uploadErr);
        Alert.alert('Upload Error', uploadErr.message);
        return;
      }

      // Get public URL with cache busting
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      updateProfile.mutate(
        { avatar_url: avatarUrl },
        {
          onSuccess: () => Alert.alert('Success', 'Avatar updated!'),
          onError: (err: any) => {
            console.error('Profile update error:', err);
            Alert.alert('Error', 'Failed to update profile');
          },
        }
      );
    } catch (err: any) {
      console.error('Image picker error:', err);
      Alert.alert('Error', err.message || 'Failed to pick an image.');
    }
  }, [updateProfile, user?.id]);

  // Open modal + fill fields
  const handleOpenModal = useCallback(() => {
    setName(profile?.name || '');
    setUsername(profile?.username || '');
    setLocation(profile?.location || '');
    setBio(profile?.bio || '');
    setTeamCode(team.name); // Leave empty - only update if user enters new code
    setModalVisible(true);
  }, [profile]);

  // Save profile changes
  const handleSaveProfile = useCallback(() => {
    // Build update object - only include team_code if user entered something
    const updates: any = {
      name,
      username,
      location,
      bio,
    };

    // Only update team_code if user entered a new code
    if (teamCode.trim().length > 0) {
      updates.team_code = teamCode.trim();
    }

    updateProfile.mutate(updates, {
      onSuccess: () => {
        setModalVisible(false);
        Alert.alert('Success', 'Profile updated!');
      },
      onError: (err: any) => Alert.alert('Error', err.message),
    });
  }, [name, username, location, bio, teamCode, updateProfile]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // Memoize stats
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

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ProfileHeader
          profile={profile}
          team={team}
          onPickImage={handlePickImage}
          onOpenModal={handleOpenModal}
        />

        <RankCard level={stats.level} xp={stats.xp} />

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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name='close' size={28} color='#111827' />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* NAME */}
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={profile?.name || 'Your name'}
              />

              {/* USERNAME */}
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder={profile?.username || 'Your username'}
                autoCapitalize='none'
              />

              {/* LOCATION */}
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder={profile?.location || 'Your location'}
              />

              {/* TEAM CODE */}
              <Text style={styles.label}>Team Code</Text>
              <TextInput
                style={styles.input}
                value={teamCode}
                onChangeText={setTeamCode}
                placeholder={
                  team?.name ? 'Enter new team code' : 'Enter team code'
                }
                autoCapitalize='none'
              />
              <Text style={styles.currentTeamLabel}>
                {team?.name ? `Current Team: ${team.name}` : 'Not on a team'}
              </Text>

              {/* BIO */}
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder={profile?.bio || 'Tell us about yourself'}
                multiline
              />
            </ScrollView>

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
  tagline: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 2,
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
    borderRadius: 8,
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
    color: '#3b82f6',
    marginTop: 8,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
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
    lineHeight: 20,
    color: '#075985',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
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
  modalBody: { padding: 20 },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
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
    marginTop: 6,
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
});
