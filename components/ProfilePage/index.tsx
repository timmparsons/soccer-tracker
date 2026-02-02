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
  ScrollView,
  StyleSheet,
  Text,
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
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user?.id) return;

    setUploadingAvatar(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
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

  const handleJoinTeam = () => {
    router.push('/(modals)/join-team');
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
                <Ionicons name='flag' size={20} color='#2B9FFF' />
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
                <Ionicons name='mail' size={20} color='#2B9FFF' />
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
                <Ionicons name='people' size={20} color='#FF7043' />
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
                <Ionicons name='add-circle' size={24} color='#2B9FFF' />
                <Text style={styles.createTeamButtonText}>Create a Team</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
              <Ionicons name='log-out' size={24} color='#FF7043' />
              <Text style={styles.actionButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          {/* Version */}
          <Text style={styles.version}>Version 2.0.0</Text>
        </ScrollView>
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
    backgroundColor: '#2B9FFF',
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
    backgroundColor: '#2B9FFF',
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
    color: '#2B9FFF',
  },

  // LIFETIME STATS CARD
  lifetimeCard: {
    backgroundColor: '#2B9FFF',
    padding: 24,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#2B9FFF',
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
    backgroundColor: '#2B9FFF',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#2B9FFF',
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
    borderColor: '#2B9FFF',
  },
  createTeamButtonText: {
    color: '#2B9FFF',
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
});
