import ActivityFeed from '@/components/HomePage/ActivityFeed';
import QuickLaunchButton from '@/components/HomePage/QuickLaunchButton';
import StreakBanner from '@/components/HomePage/StreakBanner';
import CircularProgress from '@/components/common/CircularProgress';
import PageHeader from '@/components/common/PageHeader';
import VinnieCard from '@/components/common/VinnieCard';
import StreakModal from '@/components/modals/StreakModal';
import { useChallengeNotifications } from '@/hooks/useChallengeNotifications';
import { useProfile } from '@/hooks/useProfile';
import { pickDailyCircuit, useWorkoutLibrary } from '@/hooks/useWorkouts';
import {
  useActiveStreak,
  useChallengeStats,
  useTouchTracking,
} from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { getDisplayName } from '@/utils/getDisplayName';
import { getLocalDate } from '@/utils/getLocalDate';
import { syncStreakDangerNotification } from '@/lib/streakDanger';
import { syncFreezeUsedNotification } from '@/lib/streakFreeze';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const HomeScreen = () => {
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);
  const challengeNotifications = useChallengeNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [teamNudgeDismissed, setTeamNudgeDismissed] = useState(false);
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: touchStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useTouchTracking(user?.id);

  const { data: challengeStats, refetch: refetchChallengeStats } =
    useChallengeStats(user?.id, undefined);

  const { data: activeStreakStats, refetch: refetchActiveStreak } =
    useActiveStreak(user?.id);

  const { workouts: circuitWorkouts } = useWorkoutLibrary();
  const fiveMinCircuit = pickDailyCircuit(circuitWorkouts, 300);


  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchProfile(),
      refetchStats(),
      refetchChallengeStats(),
      refetchActiveStreak(),
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['activity-reactions-unviewed', user?.id] }),
    ]);
    setRefreshing(false);
  }, [refetchProfile, refetchStats, refetchChallengeStats, refetchActiveStreak, queryClient, user?.id]);

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchStats();
      refetchChallengeStats();
      refetchActiveStreak();
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      queryClient.invalidateQueries({ queryKey: ['activity-reactions-unviewed', user?.id] });
    }, [refetchProfile, refetchStats, refetchChallengeStats, refetchActiveStreak, queryClient, user?.id]),
  );

  // Reacts to the underlying query values (not just focus/refresh events), so
  // it re-syncs once an in-flight refetch actually resolves with fresh data.
  useEffect(() => {
    if (!user?.id) return;
    syncStreakDangerNotification(
      activeStreakStats?.currentStreak || 0,
      touchStats?.today_touches || 0,
    );
  }, [user?.id, activeStreakStats?.currentStreak, touchStats?.today_touches]);

  useEffect(() => {
    if (!user?.id || !activeStreakStats?.frozenDates.length) return;
    syncFreezeUsedNotification(
      user.id,
      activeStreakStats.frozenDates,
      activeStreakStats.freezesAvailable,
    );
  }, [user?.id, activeStreakStats?.frozenDates, activeStreakStats?.freezesAvailable]);

  // Auto-show the streak modal once per calendar day, the first time
  // Home has a real streak to show.
  useEffect(() => {
    if (!user?.id || !activeStreakStats?.currentStreak) return;

    let cancelled = false;
    (async () => {
      const key = `streakModal:lastShown:${user.id}`;
      const today = getLocalDate();
      const lastShown = await AsyncStorage.getItem(key);
      if (cancelled || lastShown === today) return;

      await AsyncStorage.setItem(key, today);
      setStreakModalVisible(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, activeStreakStats?.currentStreak]);

  if (statsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#1f89ee' />
      </View>
    );
  }

  const displayName = getDisplayName(profile);
  const streak = activeStreakStats?.currentStreak || 0;
  const freezesAvailable = activeStreakStats?.freezesAvailable || 0;
  const weekTpm = touchStats?.this_week_tpm || 0;
  const challengeStreak = challengeStats?.challengeStreak || 0;
  const todayTouches = touchStats?.today_touches || 0;
  const dailyTarget = touchStats?.daily_target || 1000;
  const todayPct = Math.min((todayTouches / dailyTarget) * 100, 100);
  const todayDone = todayTouches >= dailyTarget;


  return (
    <View style={styles.container}>
      <PageHeader
        title={`Hey ${displayName}!`}
        subtitle='Ready to get some touches?'
        showAvatar={true}
        avatarUrl={profile?.avatar_url}
        challengeNotifications={challengeNotifications}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor='#1f89ee'
          />
        }
      >
        {/* STREAK BANNER */}
        {!profile?.is_coach && (
          <StreakBanner
            streak={streak}
            todayTouches={todayTouches}
            onPress={() => setStreakModalVisible(true)}
          />
        )}

        {/* TEAM NUDGE — solo players with no team */}
        {!profile?.is_coach && !profile?.team_id && !teamNudgeDismissed && (
          <View style={styles.teamNudgeBanner}>
            <TouchableOpacity
              style={styles.teamNudgeMain}
              onPress={() => router.push('/(modals)/join-team')}
              activeOpacity={0.7}
            >
              <View style={styles.teamNudgeIcon}>
                <Ionicons name='people' size={18} color='#1f89ee' />
              </View>
              <Text style={styles.teamNudgeText}>
                Got a team code? Join your teammates on the leaderboard.
              </Text>
              <Ionicons name='chevron-forward' size={16} color='#B0BEC5' />
            </TouchableOpacity>
            <View style={styles.reactionDivider} />
            <TouchableOpacity
              onPress={() => setTeamNudgeDismissed(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.reactionDismiss}
            >
              <Ionicons name='close' size={18} color='#78909C' />
            </TouchableOpacity>
          </View>
        )}

        {/* TODAY'S CHALLENGE (full width) + PROGRESS / VINNIE row */}
        {!profile?.is_coach && user?.id ? (
          <>
            <View style={styles.cardsRow}>
              <View style={styles.todayCard}>
                <Text style={styles.todaySectionLabel}>{"Today's Progress"}</Text>
                {todayDone && <Text style={styles.todayDoneBadge}>✓ Goal hit!</Text>}
                <View style={styles.todayCompact}>
                  <CircularProgress
                    progress={todayPct / 100}
                    size={64}
                    thickness={4}
                    color={todayDone ? '#ffb724' : '#FFFFFF'}
                    trackColor='rgba(255,255,255,0.2)'
                    labelColor='rgba(255,255,255,0.65)'
                  />
                  <View style={styles.todayCountRow}>
                    <Text style={styles.todayTouches}>{todayTouches.toLocaleString()}</Text>
                    <Text style={styles.todayTarget}>/{dailyTarget.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.todaySubtext}>
                    {todayDone ? 'Smashed it!' : `${(dailyTarget - todayTouches).toLocaleString()} to go`}
                  </Text>
                </View>
              </View>
              <VinnieCard
                compact
                trainedToday={(touchStats?.today_touches || 0) > 0}
                streak={streak}
                freezesAvailable={freezesAvailable}
                challengeStreak={challengeStreak}
                skillFocus={profile?.skill_focus ?? null}
                todayTouches={todayTouches}
                dailyTarget={dailyTarget}
                weekTpm={weekTpm}
                weekSessions={touchStats?.this_week_sessions}
                totalTouches={touchStats?.total_touches}
              />
            </View>
            <View style={styles.quickLaunchRow}>
              <QuickLaunchButton
                icon='flash'
                iconColor='#ffb724'
                label='Start 4-Min Burst'
                onPress={() => router.push('/(modals)/tabata')}
              />
              <QuickLaunchButton
                icon='barbell'
                iconColor='#1f89ee'
                label='Start 5-Min Circuit'
                onPress={() =>
                  fiveMinCircuit &&
                  router.push({ pathname: '/(modals)/circuit', params: { id: fiveMinCircuit.id } })
                }
                disabled={!fiveMinCircuit}
              />
            </View>
          </>
        ) : (
          <>
          {/* Coaches: full-width Vinnie + progress card */}
          <VinnieCard
            trainedToday={(touchStats?.today_touches || 0) > 0}
            streak={streak}
            freezesAvailable={freezesAvailable}
            challengeStreak={challengeStreak}
            skillFocus={profile?.skill_focus ?? null}
            todayTouches={todayTouches}
            dailyTarget={dailyTarget}
            weekTpm={weekTpm}
            weekSessions={touchStats?.this_week_sessions}
            totalTouches={touchStats?.total_touches}
          />
          <View style={styles.todayCardFull}>
            <View style={styles.todayHeader}>
              <Text style={styles.todaySectionLabel}>{"Today's Progress"}</Text>
              {todayDone && <Text style={styles.todayDoneBadge}>✓ Goal hit!</Text>}
            </View>
            <View style={styles.todayRingRow}>
              <TouchableOpacity
                onPress={() => streak > 0 && setStreakModalVisible(true)}
                activeOpacity={streak > 0 ? 0.75 : 1}
              >
                <CircularProgress
                  progress={todayPct / 100}
                  size={120}
                  color={todayDone ? '#ffb724' : '#FFFFFF'}
                  trackColor='rgba(255,255,255,0.2)'
                  labelColor='rgba(255,255,255,0.65)'
                  showStreak
                  streak={streak}
                />
              </TouchableOpacity>
              <View style={styles.todayRingMeta}>
                <View style={styles.todayCountRow}>
                  <Text style={styles.todayTouches}>{todayTouches.toLocaleString()}</Text>
                  <Text style={styles.todayTarget}>/{dailyTarget.toLocaleString()}</Text>
                </View>
                <Text style={styles.todaySubtext}>
                  {todayDone ? 'Smashed it — keep going!' : `${(dailyTarget - todayTouches).toLocaleString()} to go`}
                </Text>
              </View>
            </View>
          </View>
          </>
        )}

        {/* TEAM ACTIVITY */}
        <ActivityFeed />

      </ScrollView>

      <StreakModal
        visible={streakModalVisible}
        onClose={() => setStreakModalVisible(false)}
        streak={streak}
        freezesAvailable={freezesAvailable}
        weekActivity={activeStreakStats?.weekActivity || []}
      />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    gap: 10,
  },
  // QUICK LAUNCH BAR
  quickLaunchRow: {
    gap: 10,
  },

  // CARDS ROW (challenge + progress side by side, non-coaches)
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },

  // TODAY'S PROGRESS — compact (50% width, no ring)
  todayCard: {
    flex: 1,
    backgroundColor: '#1f89ee',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  todayCompact: {
    marginTop: 10,
    alignItems: 'center',
    gap: 6,
  },
  // TODAY'S PROGRESS — full width
  todayCardFull: {
    backgroundColor: '#1f89ee',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  todayRingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  todayRingMeta: {
    flex: 1,
  },

  todaySectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
  },
  todayDoneBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: '#31af4d',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  todayCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  todayTouches: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  todayTarget: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    marginLeft: 2,
  },
  todaySubtext: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },

  // BANNERS
  teamNudgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 8,
  },
  teamNudgeMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  teamNudgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamNudgeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a2e',
    lineHeight: 18,
  },
  reactionDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#BFDBFE',
  },
  reactionDismiss: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
