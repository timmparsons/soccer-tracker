import { useJuggles } from '@/hooks/useJuggles';
import { useProfile } from '@/hooks/useProfile';
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

// Memoized sub-components to prevent unnecessary re-renders
const ProfileHeader = memo(({ profile }: { profile: any }) => (
  <View style={styles.header}>
    <View style={styles.avatarContainer}>
      <Image
        source={{
          uri:
            profile?.avatar_url ||
            'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
        }}
        style={styles.avatar}
      />
      <TouchableOpacity style={styles.editIcon}>
        <Ionicons name='settings-sharp' size={20} color='#fff' />
      </TouchableOpacity>
    </View>

    <Text style={styles.name}>
      {profile?.name || profile?.username || 'User'}
    </Text>

    <Text style={styles.tagline}>
      {profile?.bio || 'Future Juggling Pro ⚽'}
    </Text>

    {profile?.location && (
      <Text style={styles.location}>📍 {profile.location}</Text>
    )}
  </View>
));

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

const AccountActions = memo(
  ({
    onEditPress,
    onSignOut,
  }: {
    onEditPress: () => void;
    onSignOut: () => void;
  }) => (
    <>
      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.actionList}>
        <TouchableOpacity style={styles.actionRow} onPress={onEditPress}>
          <Ionicons name='person-outline' size={22} color='#3b82f6' />
          <Text style={styles.actionText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={onSignOut}>
          <Ionicons name='log-out-outline' size={22} color='#ef4444' />
          <Text style={[styles.actionText, { color: '#ef4444' }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </>
  )
);

AccountActions.displayName = 'AccountActions';

const CoachTip = memo(() => (
  <View style={styles.tipCard}>
    <Text style={styles.tipTitle}>Coach&apos;s Tip 💬</Text>
    <Text style={styles.tipText}>
      &quot;Improvement isn&apos;t about perfection — it&apos;s about progress.
      Keep showing up and the results will come.&quot;
    </Text>
  </View>
));

CoachTip.displayName = 'CoachTip';

const ProfilePage = () => {
  const { data: user } = useUser();

  const { data: profile, isLoading: loadingProfile } = useProfile(user?.id);

  const { data: juggles, isLoading: loadingJuggles } = useJuggles(user?.id);

  const updateProfile = useUpdateProfile(user?.id);

  const [modalVisible, setModalVisible] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [teamCode, setTeamCode] = useState('');

  // Memoize handlers to prevent recreation on every render
  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const handleOpenModal = useCallback(() => {
    setName(profile?.name || '');
    setUsername(profile?.username || '');
    setLocation(profile?.location || '');
    setTeamCode(profile?.team_id || '');
    setBio(profile?.bio || '');
    setModalVisible(true);
  }, [profile]);

  const handleSaveProfile = useCallback(() => {
    updateProfile.mutate(
      { name, username, location, bio, team_id: teamCode },
      {
        onSuccess: () => {
          setModalVisible(false);
          Alert.alert('Success', 'Profile updated!');
        },
        onError: (err: any) => Alert.alert('Error', err.message),
      }
    );
  }, [name, username, location, bio, teamCode, updateProfile]);

  // Memoize computed values
  const stats = useMemo(
    () => ({
      level: juggles?.level ?? 1,
      xp: juggles?.xp_earned ?? 0,
      streak: juggles?.streak_days ?? 0,
      bestStreak: juggles?.best_daily_streak ?? 0,
    }),
    [juggles]
  );

  // Show loading state only on initial load
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
        <ProfileHeader profile={profile} />
        <RankCard level={stats.level} xp={stats.xp} />
        <StreakCard streak={stats.streak} bestStreak={stats.bestStreak} />
        <Heatmap stats={juggles} />
        <AccountActions
          onEditPress={handleOpenModal}
          onSignOut={handleSignOut}
        />
        <CoachTip />
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        animationType='slide'
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name='close' size={28} color='#111827' />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder='Your name'
              />

              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize='none'
              />

              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
              />

              <Text style={styles.label}>Team Code</Text>
              <TextInput
                style={styles.input}
                value={teamCode}
                onChangeText={setTeamCode}
                placeholder='Enter team code'
                autoCapitalize='none'
              />

              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                multiline
              />

              <Text style={styles.emailLabel}>Email: {user?.email}</Text>
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
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
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
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 6,
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
  streakMessage: { color: '#3b82f6', marginTop: 8, fontWeight: '600' },
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
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    marginLeft: 12,
  },
  tipCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    padding: 16,
    marginVertical: 24,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#075985',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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
  emailLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 20,
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
