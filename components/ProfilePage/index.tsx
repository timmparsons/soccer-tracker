import { useProfile } from '@/hooks/useProfile';
import { useTouchTracking } from '@/hooks/useTouchTracking';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const ProfilePage = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);
  const { mutateAsync: updateProfile } = useUpdateProfile(user?.id);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [customTarget, setCustomTarget] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  const TARGET_PRESETS = [
    { value: 500, label: '500', subtitle: 'Starting out', emoji: '🌱' },
    { value: 1000, label: '1,000', subtitle: 'Building habits', emoji: '💪' },
    { value: 2500, label: '2,500', subtitle: 'Getting serious', emoji: '🔥' },
    { value: 5000, label: '5,000', subtitle: 'Elite mode', emoji: '⭐' },
  ];

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        refetchProfile();
        queryClient.invalidateQueries({ queryKey: ['lifetime-stats', user.id] });
        queryClient.invalidateQueries({ queryKey: ['touch-tracking', user.id] });
      }
    }, [user?.id, refetchProfile, queryClient])
  );

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to change your avatar.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await uploadAvatar(asset.uri, asset.base64);
    }
  };

  const uploadAvatar = async (uri: string, base64Data?: string | null) => {
    if (!user?.id || !base64Data) return;

    setUploadingAvatar(true);
    try {
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, bytes, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      await updateProfile({ avatar_url: publicUrl });
      await refetchProfile();

      Alert.alert('Success', 'Your avatar has been updated!');
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Could not upload image');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data — sessions, stats, streaks, everything. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Are you absolutely sure?',
      'All your training data will be deleted forever.',
      [
        { text: 'Keep My Account', style: 'cancel' },
        {
          text: 'Yes, Delete Everything',
          style: 'destructive',
          onPress: executeDeleteAccount,
        },
      ]
    );
  };

  const executeDeleteAccount = async () => {
    if (!user?.id) return;

    try {
      // Delete all user data from tables
      await supabase.from('daily_sessions').delete().eq('user_id', user.id);
      await supabase.from('user_targets').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);

      // Attempt to delete the auth user via a database function (requires
      // a `delete_user` function with SECURITY DEFINER set up in Supabase).
      // If the function doesn't exist this will fail silently and we sign out.
      await supabase.rpc('delete_user').throwOnError();
    } catch {
      // Data tables are already cleared — sign out regardless
    } finally {
      await supabase.auth.signOut();
    }
  };

  const handleFeedback = async () => {
    const email = 'timmparsons85@gmail.com';
    const subject = 'Master Touch Feedback';
    const body = `\n\n---\nApp Version: 2.0.0\nUser: ${user?.email || 'Unknown'}`;
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert(
        'Send Feedback',
        `Email us at:\n${email}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleJoinTeam = () => {
    router.push('/(modals)/join-team');
  };

  const handleSaveTarget = async (newTarget: number) => {
    if (!user?.id || newTarget <= 0) return;

    setSavingTarget(true);
    try {
      const { error } = await supabase
        .from('user_targets')
        .upsert(
          { user_id: user.id, daily_target_touches: newTarget },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      // Refresh the touch tracking data to get the new target
      queryClient.invalidateQueries({ queryKey: ['touch-tracking', user.id] });

      setShowTargetModal(false);
      setCustomTarget('');
      Alert.alert('Success', `Daily target set to ${newTarget.toLocaleString()} touches!`);
    } catch (error) {
      console.error('Error saving target:', error);
      Alert.alert('Error', 'Failed to save target. Please try again.');
    } finally {
      setSavingTarget(false);
    }
  };

  // Get touch tracking stats
  const { data: touchStats } = useTouchTracking(user?.id);

  // Get lifetime stats from daily_sessions
  const { data: lifetimeStats } = useQuery({
    queryKey: ['lifetime-stats', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: sessions } = await supabase
        .from('daily_sessions')
        .select('touches_logged, date, created_at')
        .eq('user_id', user!.id);

      if (!sessions || sessions.length === 0) {
        return {
          lifetime_touches: 0,
          total_sessions: 0,
          days_active: 0,
          avg_daily_touches: 0,
          longest_streak: 0,
        };
      }

      const lifetimeTouches = sessions.reduce((sum, s) => sum + s.touches_logged, 0);
      const uniqueDays = new Set(sessions.map(s => s.date)).size;
      const avgDaily = uniqueDays > 0 ? Math.round(lifetimeTouches / uniqueDays) : 0;

      // Calculate longest streak
      const dates = [...new Set(sessions.map(s => s.date))].sort();
      let longestStreak = 0;
      let currentStreak = 1;

      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak++;
        } else {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, currentStreak);

      return {
        lifetime_touches: lifetimeTouches,
        total_sessions: sessions.length,
        days_active: uniqueDays,
        avg_daily_touches: avgDaily,
        longest_streak: longestStreak,
      };
    },
  });

  const displayName = profile?.name || profile?.display_name || (profile?.is_coach ? 'Coach' : 'Player');
  const dailyTarget = touchStats?.daily_target || 1000;
  const currentStreak = touchStats?.current_streak || 0;

  return (
    <>
      <View style={{ height: insets.top, backgroundColor: '#F5F7FA' }} />
      <SafeAreaView style={styles.container} edges={[]}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarGlow} />
              <Image
                source={{
                  uri:
                    profile?.avatar_url ||
                    'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                }}
                style={styles.avatar}
              />
              <TouchableOpacity
                style={styles.editAvatarButton}
                onPress={handlePickImage}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size='small' color='#FFF' />
                ) : (
                  <Ionicons name='camera' size={20} color='#FFF' />
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.role}>
              {profile?.is_coach ? '⚽ Coach' : '🎯 Player'}
            </Text>

            {/* Daily Target Badge - only for players */}
            {!profile?.is_coach && (
              <View style={styles.targetBadge}>
                <Ionicons name='flag' size={20} color='#1f89ee' />
                <Text style={styles.targetText}>
                  Daily Target: {dailyTarget.toLocaleString()} touches
                </Text>
              </View>
            )}
          </View>

          {/* Lifetime Stats Card - only for players */}
          {!profile?.is_coach && (
            <View style={styles.lifetimeCard}>
              <View style={styles.lifetimeHeader}>
                <Text style={styles.lifetimeEmoji}>🏆</Text>
                <Text style={styles.lifetimeTitle}>Lifetime Stats</Text>
              </View>
              <View style={styles.bigStatContainer}>
                <Text style={styles.bigStatValue}>
                  {(lifetimeStats?.lifetime_touches || 0).toLocaleString()}
                </Text>
                <Text style={styles.bigStatLabel}>Total Touches</Text>
              </View>
              <View style={styles.lifetimeGrid}>
                <View style={styles.lifetimeStat}>
                  <Text style={styles.lifetimeStatValue}>
                    {lifetimeStats?.total_sessions || 0}
                  </Text>
                  <Text style={styles.lifetimeStatLabel}>Sessions</Text>
                </View>
                <View style={styles.lifetimeStat}>
                  <Text style={styles.lifetimeStatValue}>
                    {lifetimeStats?.days_active || 0}
                  </Text>
                  <Text style={styles.lifetimeStatLabel}>Days Active</Text>
                </View>
                <View style={styles.lifetimeStat}>
                  <Text style={styles.lifetimeStatValue}>
                    {(lifetimeStats?.avg_daily_touches || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.lifetimeStatLabel}>Avg/Day</Text>
                </View>
              </View>
            </View>
          )}

          {/* Streaks Card - only for players */}
          {!profile?.is_coach && (
            <View style={styles.streaksCard}>
              <View style={styles.streakRow}>
                <View style={styles.streakItem}>
                  <View style={styles.streakIconContainer}>
                    <Text style={styles.streakEmoji}>🔥</Text>
                  </View>
                  <View style={styles.streakInfo}>
                    <Text style={styles.streakValue}>
                      {currentStreak}
                    </Text>
                    <Text style={styles.streakLabel}>Current Streak</Text>
                  </View>
                </View>

                <View style={styles.streakDivider} />

                <View style={styles.streakItem}>
                  <View style={styles.streakIconContainer}>
                    <Text style={styles.streakEmoji}>⭐</Text>
                  </View>
                  <View style={styles.streakInfo}>
                    <Text style={styles.streakValue}>
                      {lifetimeStats?.longest_streak || 0}
                    </Text>
                    <Text style={styles.streakLabel}>Best Streak</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Account Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Account Info</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoIconBg}>
                <Ionicons name='mail' size={20} color='#1f89ee' />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>
                  {user?.email || 'No email'}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconBg}>
                <Ionicons name='people' size={20} color='#ffb724' />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Team</Text>
                <Text style={styles.infoValue}>
                  {profile?.teams?.name || 'No team'}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconBg}>
                <Ionicons name='calendar' size={20} color='#42A5F5' />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Unknown'}
                </Text>
              </View>
            </View>
          </View>

          {/* Team Buttons (if no team) */}
          {!profile?.team_id && (
            <View style={styles.teamButtonsContainer}>
              <TouchableOpacity
                style={styles.joinTeamButton}
                onPress={handleJoinTeam}
              >
                <Ionicons name='people' size={24} color='#FFF' />
                <Text style={styles.joinTeamButtonText}>Join a Team</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.createTeamButton}
                onPress={() => router.push('/(modals)/create-team')}
              >
                <Ionicons name='add-circle' size={24} color='#1f89ee' />
                <Text style={styles.createTeamButtonText}>Create a Team</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Settings Card - only for players */}
          {!profile?.is_coach && (
            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => setShowTargetModal(true)}
              >
                <View style={styles.settingsRowLeft}>
                  <View style={styles.settingsIconBg}>
                    <Ionicons name='flag' size={20} color='#1f89ee' />
                  </View>
                  <View>
                    <Text style={styles.settingsLabel}>Daily Target</Text>
                    <Text style={styles.settingsValue}>
                      {dailyTarget.toLocaleString()} touches
                    </Text>
                  </View>
                </View>
                <Ionicons name='chevron-forward' size={20} color='#B0BEC5' />
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionButton} onPress={handleFeedback}>
              <Ionicons name='chatbubble-ellipses' size={24} color='#1f89ee' />
              <Text style={styles.actionButtonText}>Send Feedback</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
              <Ionicons name='log-out' size={24} color='#ffb724' />
              <Text style={styles.actionButtonText}>Sign Out</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionButton} onPress={handleDeleteAccount}>
              <Ionicons name='trash' size={24} color='#D32F2F' />
              <Text style={[styles.actionButtonText, styles.deleteAccountText]}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          {/* Version */}
          <Text style={styles.version}>Version 2.0.0</Text>
        </ScrollView>

        {/* Daily Target Modal */}
        <Modal
          visible={showTargetModal}
          animationType='slide'
          transparent={true}
          onRequestClose={() => setShowTargetModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalEmoji}>🎯</Text>
                <Text style={styles.modalTitle}>Set Daily Target</Text>
                <Text style={styles.modalSubtitle}>
                  How many touches do you want to hit each day?
                </Text>
              </View>

              <View style={styles.presetsList}>
                {TARGET_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.value}
                    style={[
                      styles.presetCard,
                      dailyTarget === preset.value && styles.presetCardActive,
                    ]}
                    onPress={() => handleSaveTarget(preset.value)}
                    disabled={savingTarget}
                  >
                    <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                    <View style={styles.presetTextContainer}>
                      <Text
                        style={[
                          styles.presetValue,
                          dailyTarget === preset.value && styles.presetValueActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                      <Text style={styles.presetSubtitle}>{preset.subtitle}</Text>
                    </View>
                    {dailyTarget === preset.value && (
                      <Ionicons name='checkmark-circle' size={24} color='#1f89ee' />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.customSection}>
                <Text style={styles.customLabel}>Or enter a custom target</Text>
                <View style={styles.customRow}>
                  <TextInput
                    style={styles.customInput}
                    placeholder='e.g. 1500'
                    placeholderTextColor='#B0BEC5'
                    keyboardType='number-pad'
                    value={customTarget}
                    onChangeText={setCustomTarget}
                  />
                  <TouchableOpacity
                    style={[
                      styles.customButton,
                      (!customTarget || savingTarget) && styles.customButtonDisabled,
                    ]}
                    onPress={() => {
                      const target = parseInt(customTarget);
                      if (target > 0) {
                        handleSaveTarget(target);
                      }
                    }}
                    disabled={!customTarget || savingTarget}
                  >
                    {savingTarget ? (
                      <ActivityIndicator size='small' color='#FFF' />
                    ) : (
                      <Text style={styles.customButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowTargetModal(false);
                  setCustomTarget('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </>
  );
};

export default ProfilePage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // HEADER
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 68,
    backgroundColor: '#1f89ee',
    opacity: 0.2,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: '#FFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1f89ee',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  name: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78909C',
    marginBottom: 16,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  targetText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1f89ee',
  },

  // LIFETIME STATS CARD
  lifetimeCard: {
    backgroundColor: '#1f89ee',
    padding: 24,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  lifetimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  lifetimeEmoji: {
    fontSize: 28,
  },
  lifetimeTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
  },
  bigStatContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  bigStatValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  bigStatLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  lifetimeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  lifetimeStat: {
    alignItems: 'center',
  },
  lifetimeStatValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFD54F',
    marginBottom: 4,
  },
  lifetimeStatLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // STREAKS CARD
  streaksCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 28,
  },
  streakInfo: {
    flex: 1,
  },
  streakValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
  streakDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },

  // INFO CARD
  infoCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  infoIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },

  // TEAM BUTTONS
  teamButtonsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  joinTeamButton: {
    flexDirection: 'row',
    backgroundColor: '#1f89ee',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  joinTeamButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  createTeamButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#1f89ee',
  },
  createTeamButtonText: {
    color: '#1f89ee',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // ACTIONS CARD
  actionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  deleteAccountText: {
    color: '#D32F2F',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#F5F7FA',
    marginHorizontal: 20,
  },

  // VERSION
  version: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#B0BEC5',
  },

  // SETTINGS CARD
  settingsCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingsIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8EAF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
    marginBottom: 2,
  },
  settingsValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  presetsList: {
    gap: 10,
    marginBottom: 24,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 14,
  },
  presetCardActive: {
    backgroundColor: '#E8EAF6',
    borderColor: '#1f89ee',
  },
  presetEmoji: {
    fontSize: 28,
  },
  presetTextContainer: {
    flex: 1,
  },
  presetValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  presetValueActive: {
    color: '#1f89ee',
  },
  presetSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
  customSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
    marginBottom: 16,
  },
  customLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
    marginBottom: 12,
  },
  customRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customInput: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  customButton: {
    backgroundColor: '#1f89ee',
    paddingHorizontal: 28,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  customButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  modalCancel: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78909C',
  },
});
