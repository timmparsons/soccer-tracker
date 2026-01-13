import { useJuggles } from '@/hooks/useJuggles';
import { useProfile } from '@/hooks/useProfile';
import { useTeam } from '@/hooks/useTeam';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';

import { Ionicons } from '@expo/vector-icons';
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

import { getLevelFromXp, getRankName } from '@/lib/xp';
import { useRouter } from 'expo-router';
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

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const updateProfile = useUpdateProfile(user?.id);

  const totalXp = profile?.total_xp ?? 0;
  const { level, xpIntoLevel, xpForNextLevel } = getLevelFromXp(totalXp);
  const rankName = getRankName(level);

  const [modalVisible, setModalVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [teamCode, setTeamCode] = useState('');

  const handleOpenModal = useCallback(() => {
    setFirstName(profile?.first_name || '');
    setLastName(profile?.last_name || '');
    setTeamCode('');
    setModalVisible(true);
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;

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

    const displayName = firstName.trim()
      ? lastName.trim()
        ? `${firstName.trim()} ${lastName.trim()[0].toUpperCase()}.`
        : firstName.trim()
      : profile?.display_name || 'Player';

    updateProfile.mutate(
      {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        display_name: displayName,
        team_id: teamId,
      },
      { onSuccess: () => setModalVisible(false) }
    );
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
          paddingBottom: 100,
          paddingTop: insets.top + 16, // ✅ ANDROID HEADER FIX
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

        <StreakCard
          streak={juggles?.streak_days ?? 0}
          bestStreak={juggles?.best_daily_streak ?? 0}
        />

        <AccountActions
          onOpenModal={handleOpenModal}
          onSignOut={async () => {
            await supabase.auth.signOut();
          }}
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
              <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
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

                <Text style={styles.label}>Team Code</Text>
                <TextInput
                  style={styles.input}
                  value={teamCode}
                  onChangeText={setTeamCode}
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
};

export default ProfilePage;

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
    marginBottom: 20,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
  },
  avatarGlow: {
    position: 'absolute',
    inset: -6,
    borderRadius: 999,
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
  },
  name: {
    fontSize: 28,
    fontWeight: '900',
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
    color: '#6B7280',
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 28,
    marginBottom: 12,
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
  },

  streakCard: {
    backgroundColor: '#2C3E50',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flameIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,165,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakTextBlock: {
    marginLeft: 16,
  },
  streakMain: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
  },
  streakSub: {
    color: '#FFD700',
    marginTop: 4,
  },
  streakMessage: {
    marginTop: 12,
    textAlign: 'center',
    color: '#FFA500',
    fontWeight: '700',
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
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#F5F9FF',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FFA500',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '700',
    color: '#6B7280',
  },
  saveButtonText: {
    fontWeight: '900',
    color: '#FFF',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
  },
});
