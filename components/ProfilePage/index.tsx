import { useViewMode } from '@/app/(tabs)/_layout';
import BadgeGrid from '@/components/common/BadgeGrid';
import type { Badge } from '@/hooks/useBadges';
import {
  useAllBadges,
  useLeaderboardWinCount,
  useUserBadges,
} from '@/hooks/useBadges';
import { useArchivedSeasons, type ArchivedSeason } from '@/hooks/useArchivedSeasons';
import PastSeasonModal from '@/components/modals/PastSeasonModal';
import { useProfile } from '@/hooks/useProfile';
import { useJugglingRecord, useTouchTracking } from '@/hooks/useTouchTracking';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { useUser } from '@/hooks/useUser';
import { checkAndAwardBadges } from '@/lib/checkBadges';
import { supabase } from '@/lib/supabase';
import { getLevelFromXp, getRankBadge, getRankName } from '@/lib/xp';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<{
    badge: Badge;
    isEarned: boolean;
  } | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<ArchivedSeason | null>(null);

  const { data: archivedSeasons = [] } = useArchivedSeasons(profile?.team_id);

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
        queryClient.invalidateQueries({
          queryKey: ['lifetime-stats', user.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['touch-tracking', user.id],
        });
      }
    }, [user?.id, refetchProfile, queryClient]),
  );

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to change your avatar.',
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
      ],
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
      ],
    );
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePasswordModal(false);
      Alert.alert('Done', 'Your password has been updated.');
    }
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
      Alert.alert('Send Feedback', `Email us at:\n${email}`, [{ text: 'OK' }]);
    }
  };

  const handleJoinTeam = () => {
    router.push('/(modals)/join-team');
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    setSavingName(true);
    try {
      await updateProfile({ display_name: trimmed });
      await refetchProfile();
      setShowNameModal(false);
      setNameInput('');
    } catch {
      Alert.alert('Error', 'Failed to update name. Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveTarget = async (newTarget: number) => {
    if (!user?.id || newTarget <= 0) return;

    setSavingTarget(true);
    try {
      const { error } = await supabase
        .from('user_targets')
        .upsert(
          { user_id: user.id, daily_target_touches: newTarget },
          { onConflict: 'user_id' },
        );

      if (error) throw error;

      // Refresh the touch tracking data to get the new target
      queryClient.invalidateQueries({ queryKey: ['touch-tracking', user.id] });

      setShowTargetModal(false);
      setCustomTarget('');
      Alert.alert(
        'Success',
        `Daily target set to ${newTarget.toLocaleString()} touches!`,
      );
    } catch (error) {
      console.error('Error saving target:', error);
      Alert.alert('Error', 'Failed to save target. Please try again.');
    } finally {
      setSavingTarget(false);
    }
  };

  // Get touch tracking stats
  const { data: touchStats } = useTouchTracking(user?.id);
  const { data: jugglePB = 0 } = useJugglingRecord(user?.id);

  // Badges
  const { data: allBadges = [] } = useAllBadges();
  const { data: userBadges = [], refetch: refetchBadges } = useUserBadges(
    user?.id,
  );
  const { data: leaderboardWins = 0 } = useLeaderboardWinCount(user?.id);
  const earnedBadgeIds = new Set(userBadges.map((b) => b.badge_id));

  // Silent badge backfill — awards any qualifying badges the user hasn't earned yet
  useEffect(() => {
    if (!user?.id || !touchStats) return;
    checkAndAwardBadges(user.id, {
      totalSessions: touchStats.total_sessions ?? 0,
      totalTouches: touchStats.total_touches ?? 0,
      currentStreak: touchStats.current_streak ?? 0,
      // If the user already has a juggle PB, treat it as a beaten record so the badge backfills
      jugglesThisSession: jugglePB > 0 ? jugglePB : null,
      previousJugglePB: jugglePB > 0 ? jugglePB - 1 : 0,
      durationMinutes: null,
      sessionsThisWeek: touchStats.this_week_sessions ?? 0,
      teamId: profile?.team_id ?? null,
    }).then((newIds) => {
      if (newIds.length > 0) refetchBadges();
    });
  }, [
    user?.id,
    touchStats?.total_touches,
    touchStats?.current_streak,
    jugglePB,
  ]);

  // Badge counts for stackable milestones
  const totalTouches = touchStats?.total_touches ?? 0;
  const totalSessions = touchStats?.total_sessions ?? 0;
  const badgeCounts: Record<string, number> = {
    volume_1k: Math.max(1, Math.floor(totalTouches / 1_000)),
    volume_10k: Math.max(1, Math.floor(totalTouches / 10_000)),
    volume_50k: Math.max(1, Math.floor(totalTouches / 50_000)),
    volume_100k: Math.max(1, Math.floor(totalTouches / 100_000)),
    sessions_10: Math.max(1, Math.floor(totalSessions / 10)),
    sessions_50: Math.max(1, Math.floor(totalSessions / 50)),
    sessions_100: Math.max(1, Math.floor(totalSessions / 100)),
    social_no1: Math.max(1, leaderboardWins),
  };

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

      const lifetimeTouches = sessions.reduce(
        (sum, s) => sum + s.touches_logged,
        0,
      );
      const uniqueDays = new Set(sessions.map((s) => s.date)).size;
      const avgDaily =
        uniqueDays > 0 ? Math.round(lifetimeTouches / uniqueDays) : 0;

      // Calculate longest streak
      const dates = [...new Set(sessions.map((s) => s.date))].sort();
      let longestStreak = 0;
      let currentStreak = 1;

      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diffDays = Math.floor(
          (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
        );

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

  const { viewMode, setViewMode } = useViewMode();

  const displayName =
    profile?.name ||
    profile?.display_name ||
    (profile?.is_coach ? 'Coach' : 'Player');
  const dailyTarget = touchStats?.daily_target || 1000;
  const currentStreak = touchStats?.current_streak || 0;
  const { level, xpIntoLevel, xpForNextLevel } = getLevelFromXp(
    profile?.total_xp ?? 0,
  );
  const rankName = getRankName(level);
  const rankBadge = getRankBadge(rankName);
  const xpProgress = xpForNextLevel > 0 ? xpIntoLevel / xpForNextLevel : 1;

  return (
    <>
      <View style={{ height: insets.top, backgroundColor: '#F5F7FA' }} />
      <SafeAreaView style={styles.container} edges={[]}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.settingsGearButton}
              onPress={() => setShowSettingsModal(true)}
            >
              <Ionicons name='settings-outline' size={22} color='#78909C' />
            </TouchableOpacity>
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

            <View style={styles.nameRow}>
              <Text style={styles.name}>{displayName}</Text>
              {!profile?.is_coach && (
                <TouchableOpacity
                  style={styles.editNameButton}
                  onPress={() => {
                    setNameInput(displayName);
                    setShowNameModal(true);
                  }}
                >
                  <Ionicons name='pencil' size={14} color='#78909C' />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.role}>
              {profile?.is_coach ? '⚽ Coach' : '🎯 Player'}
            </Text>
            <View style={styles.xpPill}>
              <Text style={styles.xpPillText}>
                Level {level} · {rankName} ·{' '}
                {(profile?.total_xp ?? 0).toLocaleString()} XP
              </Text>
            </View>

            {/* XP Progress Bar */}
            <View style={styles.xpProgressContainer}>
              <View style={styles.xpProgressTrack}>
                <View
                  style={[
                    styles.xpProgressFill,
                    {
                      width: `${Math.round(xpProgress * 100)}%`,
                      backgroundColor: rankBadge.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.xpProgressLabel}>
                {xpIntoLevel.toLocaleString()} /{' '}
                {xpForNextLevel.toLocaleString()} XP to Level {level + 1}
              </Text>
            </View>

            {/* View Roadmap button */}
            <TouchableOpacity
              style={styles.roadmapButton}
              onPress={() => router.push(`/(modals)/roadmap?level=${level}`)}
            >
              <Ionicons name='map-outline' size={16} color='#ffb724' />
              <Text style={styles.roadmapButtonText}>View Level Roadmap</Text>
              <Ionicons name='chevron-forward' size={16} color='#ffb724' />
            </TouchableOpacity>

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
                    <Text style={styles.streakValue}>{currentStreak}</Text>
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

          {/* Training Levels Card */}
          <View style={styles.levelsCard}>
            <Text style={styles.levelsTitle}>Training Levels</Text>
            <Text style={styles.levelsSubtitle}>
              Bill Beswick&apos;s performance philosophy. Your badge on the
              leaderboard shows which level your touches put you at.
            </Text>

            <View style={styles.levelRow}>
              <View style={[styles.levelDot, { backgroundColor: '#D84315' }]} />
              <View style={styles.levelInfo}>
                <View style={styles.levelNameRow}>
                  <Text style={[styles.levelName, { color: '#D84315' }]}>
                    Train to Dominate
                  </Text>
                  <Text style={styles.levelThreshold}>2,500+ touches</Text>
                </View>
                <Text style={styles.levelDescription}>
                  Exceptional athletes whose training ensures winning is
                  inevitable.
                </Text>
              </View>
            </View>

            <View style={styles.levelRow}>
              <View style={[styles.levelDot, { backgroundColor: '#1565C0' }]} />
              <View style={styles.levelInfo}>
                <View style={styles.levelNameRow}>
                  <Text style={[styles.levelName, { color: '#1565C0' }]}>
                    Train to Win
                  </Text>
                  <Text style={styles.levelThreshold}>
                    1,000 – 2,499 touches
                  </Text>
                </View>
                <Text style={styles.levelDescription}>
                  Athletes committed to winning on match day.
                </Text>
              </View>
            </View>

            <View style={[styles.levelRow, { marginBottom: 0 }]}>
              <View style={[styles.levelDot, { backgroundColor: '#78909C' }]} />
              <View style={styles.levelInfo}>
                <View style={styles.levelNameRow}>
                  <Text style={[styles.levelName, { color: '#78909C' }]}>
                    Turn Up
                  </Text>
                  <Text style={styles.levelThreshold}>Under 1,000 touches</Text>
                </View>
                <Text style={styles.levelDescription}>
                  Athletes who show up and do the required work.
                </Text>
              </View>
            </View>
          </View>

          {/* Badges Card */}
          <View style={styles.badgesCard}>
            <View style={styles.badgesHeader}>
              <Text style={styles.badgesTitle}>Badges</Text>
              <Text style={styles.badgesCount}>
                {earnedBadgeIds.size}/{allBadges.length} earned
              </Text>
            </View>
            <BadgeGrid
              allBadges={allBadges}
              earnedIds={earnedBadgeIds}
              badgeCounts={badgeCounts}
              dark
              onBadgePress={(badge, isEarned) =>
                setSelectedBadge({ badge, isEarned })
              }
            />
          </View>

          {/* Past Seasons */}
          {archivedSeasons.length > 0 && (
            <View style={styles.pastSeasonsCard}>
              <Text style={styles.pastSeasonsTitle}>Past Seasons</Text>
              {archivedSeasons.map((season) => {
                const start = new Date(season.season_start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                const end = new Date(season.season_end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                const top3 = season.player_standings.slice(0, 3);
                return (
                  <TouchableOpacity
                    key={season.id}
                    style={styles.pastSeasonRow}
                    onPress={() => setSelectedSeason(season)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pastSeasonLeft}>
                      <Text style={styles.pastSeasonNumber}>Season {season.season_number}</Text>
                      <Text style={styles.pastSeasonDates}>{start} – {end}</Text>
                      {top3.length > 0 && (
                        <Text style={styles.pastSeasonTop} numberOfLines={1}>
                          {top3.map((p, i) => `${['🥇','🥈','🥉'][i]} ${p.name}`).join('  ')}
                        </Text>
                      )}
                    </View>
                    <View style={styles.pastSeasonRight}>
                      <Text style={styles.pastSeasonLevel}>Lv {season.final_team_level}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#78909C" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {selectedSeason && (
          <PastSeasonModal
            visible={!!selectedSeason}
            onClose={() => setSelectedSeason(null)}
            season={selectedSeason}
          />
        )}

        {/* Settings Modal */}
        <Modal
          visible={showSettingsModal}
          animationType='slide'
          transparent={true}
          onRequestClose={() => setShowSettingsModal(false)}
        >
          <View style={styles.settingsOverlay}>
            <View
              style={[
                styles.settingsSheet,
                { paddingBottom: insets.bottom + 16 },
              ]}
            >
              <View style={styles.settingsSheetHandle} />
              <TouchableOpacity
                style={styles.settingsSheetClose}
                onPress={() => setShowSettingsModal(false)}
              >
                <Ionicons name='close' size={20} color='#6B7280' />
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.settingsSheetTitle}>Settings</Text>

                {/* Account Info */}
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
                          ? new Date(profile.created_at).toLocaleDateString(
                              'en-US',
                              { month: 'long', year: 'numeric' },
                            )
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
                      onPress={() => {
                        setShowSettingsModal(false);
                        router.push('/(modals)/create-team');
                      }}
                    >
                      <Ionicons name='add-circle' size={24} color='#1f89ee' />
                      <Text style={styles.createTeamButtonText}>
                        Create a Team
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Settings - players */}
                {!profile?.is_coach && (
                  <View style={styles.settingsCard}>
                    <Text style={styles.settingsTitle}>Preferences</Text>
                    <TouchableOpacity
                      style={styles.settingsRow}
                      onPress={() => {
                        setShowSettingsModal(false);
                        setShowTargetModal(true);
                      }}
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
                      <Ionicons
                        name='chevron-forward'
                        size={20}
                        color='#B0BEC5'
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {/* View Mode Toggle - coaches */}
                {profile?.is_coach && (
                  <View style={styles.settingsCard}>
                    <Text style={styles.settingsTitle}>View</Text>
                    <TouchableOpacity
                      style={styles.settingsRow}
                      onPress={() =>
                        setViewMode(viewMode === 'coach' ? 'player' : 'coach')
                      }
                    >
                      <View style={styles.settingsRowLeft}>
                        <View style={styles.settingsIconBg}>
                          <Ionicons
                            name={viewMode === 'coach' ? 'clipboard' : 'person'}
                            size={20}
                            color='#1f89ee'
                          />
                        </View>
                        <View>
                          <Text style={styles.settingsLabel}>Current View</Text>
                          <Text style={styles.settingsValue}>
                            {viewMode === 'coach'
                              ? 'Coach Dashboard'
                              : 'Player View'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.switchViewText}>
                        Switch to {viewMode === 'coach' ? 'Player' : 'Coach'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actionsCard}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setShowSettingsModal(false);
                      setShowChangePasswordModal(true);
                    }}
                  >
                    <Ionicons name='key' size={24} color='#1f89ee' />
                    <Text style={styles.actionButtonText}>Change Password</Text>
                  </TouchableOpacity>
                  <View style={styles.actionDivider} />
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleFeedback}
                  >
                    <Ionicons
                      name='chatbubble-ellipses'
                      size={24}
                      color='#1f89ee'
                    />
                    <Text style={styles.actionButtonText}>Send Feedback</Text>
                  </TouchableOpacity>
                  <View style={styles.actionDivider} />
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleSignOut}
                  >
                    <Ionicons name='log-out' size={24} color='#ffb724' />
                    <Text style={styles.actionButtonText}>Sign Out</Text>
                  </TouchableOpacity>
                  <View style={styles.actionDivider} />
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleDeleteAccount}
                  >
                    <Ionicons name='trash' size={24} color='#D32F2F' />
                    <Text
                      style={[
                        styles.actionButtonText,
                        styles.deleteAccountText,
                      ]}
                    >
                      Delete Account
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.version}>Version 2.2.5</Text>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Change Password Modal */}
        <Modal
          visible={showChangePasswordModal}
          animationType='slide'
          transparent={true}
          onRequestClose={() => setShowChangePasswordModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.changePasswordOverlay}
          >
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowChangePasswordModal(false)} />
            <View style={[styles.changePasswordSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.sheetHandle} />
              <TouchableOpacity style={styles.sheetClose} onPress={() => setShowChangePasswordModal(false)}>
                <Ionicons name='close' size={20} color='#6B7280' />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Change Password</Text>
              <Text style={styles.sheetSubtitle}>Choose a new password for your account</Text>

              <TextInput
                style={styles.sheetInput}
                placeholder='New password'
                placeholderTextColor='#9CA3AF'
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                autoFocus
              />
              <TextInput
                style={styles.sheetInput}
                placeholder='Confirm new password'
                placeholderTextColor='#9CA3AF'
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <TouchableOpacity
                style={[styles.sheetSaveButton, changingPassword && { opacity: 0.5 }]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color='#FFF' />
                ) : (
                  <Text style={styles.sheetSaveButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

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
                            dailyTarget === preset.value &&
                              styles.presetValueActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                        <Text style={styles.presetSubtitle}>
                          {preset.subtitle}
                        </Text>
                      </View>
                      {dailyTarget === preset.value && (
                        <Ionicons
                          name='checkmark-circle'
                          size={24}
                          color='#1f89ee'
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.customSection}>
                  <Text style={styles.customLabel}>
                    Or enter a custom target
                  </Text>
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
                        (!customTarget || savingTarget) &&
                          styles.customButtonDisabled,
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

        {/* Edit Name Modal */}
        <Modal
          visible={showNameModal}
          animationType='slide'
          transparent={true}
          onRequestClose={() => setShowNameModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalEmoji}>✏️</Text>
                  <Text style={styles.modalTitle}>Edit Name</Text>
                  <Text style={styles.modalSubtitle}>
                    This is the name your teammates see
                  </Text>
                </View>

                <TextInput
                  style={styles.nameInput}
                  placeholder='Your name'
                  placeholderTextColor='#9CA3AF'
                  value={nameInput}
                  onChangeText={setNameInput}
                  maxLength={40}
                  autoFocus
                />

                <TouchableOpacity
                  style={[
                    styles.nameSaveButton,
                    (!nameInput.trim() || savingName) &&
                      styles.nameSaveButtonDisabled,
                  ]}
                  onPress={handleSaveName}
                  disabled={!nameInput.trim() || savingName}
                >
                  {savingName ? (
                    <ActivityIndicator color='#FFF' />
                  ) : (
                    <Text style={styles.nameSaveButtonText}>Save Name</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => {
                    setShowNameModal(false);
                    setNameInput('');
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>

      {/* Badge Detail Modal */}
      <Modal
        visible={!!selectedBadge}
        animationType='fade'
        transparent={true}
        onRequestClose={() => setSelectedBadge(null)}
      >
        <TouchableOpacity
          style={styles.badgeModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedBadge(null)}
        >
          <View style={styles.badgeModalCard}>
            <View
              style={[
                styles.badgeModalIconRing,
                selectedBadge?.isEarned
                  ? {
                      backgroundColor: selectedBadge.badge.color + '22',
                      borderColor: selectedBadge.badge.color,
                    }
                  : { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
              ]}
            >
              <Ionicons
                name={selectedBadge?.badge.icon as any}
                size={32}
                color={
                  selectedBadge?.isEarned
                    ? selectedBadge.badge.color
                    : '#C4C4C4'
                }
              />
            </View>
            <Text
              style={[
                styles.badgeModalName,
                selectedBadge?.isEarned && { color: selectedBadge.badge.color },
              ]}
            >
              {selectedBadge?.badge.name}
            </Text>
            <Text style={styles.badgeModalDesc}>
              {selectedBadge?.badge.description}
            </Text>
            {selectedBadge?.isEarned &&
              selectedBadge.badge.id &&
              (badgeCounts[selectedBadge.badge.id] ?? 1) > 1 && (
                <Text
                  style={[
                    styles.badgeModalCount,
                    { color: selectedBadge.badge.color },
                  ]}
                >
                  ×{badgeCounts[selectedBadge.badge.id]} earned
                </Text>
              )}
            <View
              style={[
                styles.badgeModalStatus,
                selectedBadge?.isEarned
                  ? styles.badgeModalStatusEarned
                  : styles.badgeModalStatusLocked,
              ]}
            >
              <Ionicons
                name={
                  selectedBadge?.isEarned ? 'checkmark-circle' : 'lock-closed'
                }
                size={14}
                color={selectedBadge?.isEarned ? '#065F46' : '#6B7280'}
              />
              <Text
                style={[
                  styles.badgeModalStatusText,
                  selectedBadge?.isEarned
                    ? styles.badgeModalStatusTextEarned
                    : styles.badgeModalStatusTextLocked,
                ]}
              >
                {selectedBadge?.isEarned ? 'EARNED' : 'LOCKED'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  editNameButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  role: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78909C',
    marginBottom: 8,
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

  xpPill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 10,
  },
  xpPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },
  xpProgressContainer: {
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 16,
    gap: 5,
  },
  xpProgressTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpProgressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  roadmapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ffb724',
  },
  roadmapButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffb724',
  },
  settingsGearButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  changePasswordOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  changePasswordSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetClose: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 20,
  },
  sheetInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  sheetSaveButton: {
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  sheetSaveButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF',
  },
  settingsSheet: {
    backgroundColor: '#F5F7FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '90%',
  },
  settingsSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  settingsSheetClose: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsSheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 16,
    marginTop: 4,
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
  levelsCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  badgesCard: {
    backgroundColor: '#1E1A3A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1E1A3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  badgesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  badgesTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  badgesCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A78BFA',
  },
  badgeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  badgeModalCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: 10,
  },
  badgeModalIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badgeModalName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  badgeModalCount: {
    fontSize: 15,
    fontWeight: '900',
  },
  badgeModalDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  badgeModalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  badgeModalStatusEarned: {
    backgroundColor: '#D1FAE5',
  },
  badgeModalStatusLocked: {
    backgroundColor: '#F3F4F6',
  },
  badgeModalStatusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  badgeModalStatusTextEarned: {
    color: '#065F46',
  },
  badgeModalStatusTextLocked: {
    color: '#6B7280',
  },
  levelsTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  levelsSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    lineHeight: 19,
    marginBottom: 16,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  levelDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    flexShrink: 0,
  },
  levelInfo: {
    flex: 1,
  },
  levelNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  levelName: {
    fontSize: 15,
    fontWeight: '800',
  },
  levelThreshold: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  levelDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: '#78909C',
    lineHeight: 18,
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
  switchViewText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
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
  nameInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  nameSaveButton: {
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 4,
  },
  nameSaveButtonDisabled: {
    opacity: 0.4,
  },
  nameSaveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },

  // Past Seasons
  pastSeasonsCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  pastSeasonsTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  pastSeasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pastSeasonLeft: {
    flex: 1,
    gap: 2,
  },
  pastSeasonNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  pastSeasonDates: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
  },
  pastSeasonTop: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
  pastSeasonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pastSeasonLevel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },
});
