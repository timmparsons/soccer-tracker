import TeamBadgeProgressStrip from '@/components/TeamBadgeProgress';
import { getLocalDate } from '@/utils/getLocalDate';
import CircularProgress from '@/components/common/CircularProgress';
import MiniSparkline from '@/components/common/MiniSparkline';
import PageHeader from '@/components/common/PageHeader';
import VinnieCard from '@/components/common/VinnieCard';
import { getWeeklyChallengeStatus } from '@/lib/checkTeamBadges';
import { useQuery } from '@tanstack/react-query';
import { useChallengeRecord } from '@/hooks/usePlayerChallenges';
import { useProfile } from '@/hooks/useProfile';
import {
  useChallengeStats,
  useDailyTouchHistory,
  useRecentSessions,
  useTouchTracking,
} from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { getDisplayName } from '@/utils/getDisplayName';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const HomeScreen = () => {
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: touchStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useTouchTracking(user?.id);

  const { data: challengeStats, refetch: refetchChallengeStats } =
    useChallengeStats(user?.id, undefined);

  const { data: recentSessions = [], refetch: refetchRecent } =
    useRecentSessions(user?.id, 3);
  const { data: challengeRecord = { wins: 0, losses: 0, streak: 0 } } =
    useChallengeRecord(user?.id);
  const { data: dailyHistory = [0, 0, 0, 0, 0, 0, 0] } = useDailyTouchHistory(
    user?.id,
  );

  const { data: teamBadgeProgress } = useQuery({
    queryKey: ['team-badge-progress', profile?.team_id],
    enabled: !!profile?.team_id,
    staleTime: 1000 * 60 * 2,
    queryFn: () => getWeeklyChallengeStatus(profile!.team_id!),
  });
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchProfile(),
      refetchStats(),
      refetchChallengeStats(),
      refetchRecent(),
    ]);
    setRefreshing(false);
  }, [refetchProfile, refetchStats, refetchChallengeStats, refetchRecent]);

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchStats();
      refetchChallengeStats();
      refetchRecent();
    }, [refetchProfile, refetchStats, refetchChallengeStats, refetchRecent]),
  );

  if (statsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#1f89ee' />
      </View>
    );
  }

  const displayName = getDisplayName(profile);
  const weekTouches = touchStats?.this_week_touches || 0;
  const streak = touchStats?.current_streak || 0;
  const weekTpm = touchStats?.this_week_tpm || 0;
  const challengeStreak = challengeStats?.challengeStreak || 0;
  const winStreak = challengeRecord.streak;
  const todayTouches = touchStats?.today_touches || 0;
  const dailyTarget = touchStats?.daily_target || 1000;
  const todayPct = Math.min((todayTouches / dailyTarget) * 100, 100);
  const todayDone = todayTouches >= dailyTarget;

  const formatSessionDate = (dateStr: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const d = new Date(dateStr + 'T00:00:00');
    if (dateStr === getLocalDate(today)) return 'Today';
    if (dateStr === getLocalDate(yesterday)) return 'Yesterday';
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTpmLabel = (tpm: number) => {
    if (tpm === 0) return 'No data';
    if (tpm < 30) return 'Slow pace';
    if (tpm < 50) return 'Moderate';
    if (tpm < 80) return 'Good tempo!';
    return 'Game speed!';
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={`Hey ${displayName}!`}
        subtitle='Ready to get some touches?'
        showAvatar={true}
        avatarUrl={profile?.avatar_url}
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
        {/* VINNIE */}
        <VinnieCard
          trainedToday={(touchStats?.today_touches || 0) > 0}
          streak={streak}
          challengeStreak={challengeStreak}
          skillFocus={profile?.skill_focus ?? null}
          todayTouches={todayTouches}
          dailyTarget={dailyTarget}
          weekTpm={weekTpm}
          weekSessions={touchStats?.this_week_sessions}
          totalTouches={touchStats?.total_touches}
        />

        {/* TEAM BADGE PROGRESS */}
        {teamBadgeProgress && !teamBadgeProgress.achieved && (
          <TeamBadgeProgressStrip status={teamBadgeProgress} />
        )}

        {/* TODAY'S PROGRESS */}
        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <Text style={styles.todaySectionLabel}>{"Today's Progress"}</Text>
            {todayDone && (
              <Text style={styles.todayDoneBadge}>✓ Goal hit!</Text>
            )}
          </View>
          <View style={styles.todayRingRow}>
            <CircularProgress
              progress={todayPct / 100}
              size={120}
              color={todayDone ? '#ffb724' : '#FFFFFF'}
              trackColor='rgba(255,255,255,0.2)'
              labelColor='rgba(255,255,255,0.65)'
            />
            <View style={styles.todayRingMeta}>
              <View style={styles.todayCountRow}>
                <Text style={styles.todayTouches}>
                  {todayTouches.toLocaleString()}
                </Text>
                <Text style={styles.todayTarget}>
                  /{dailyTarget.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.todaySubtext}>
                {todayDone
                  ? 'Smashed it — keep going!'
                  : `${(dailyTarget - todayTouches).toLocaleString()} to go`}
              </Text>
            </View>
          </View>
        </View>


        {/* QUICK STATS */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statWeek]}>
            <View style={[styles.statIconBg, { backgroundColor: '#EFF6FF' }]}>
              <Text style={styles.statIcon}>📊</Text>
            </View>
            <Text style={[styles.statValue, { color: '#1f89ee' }]}>
              {weekTouches.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statSubtext}>Resets Sunday</Text>
            <MiniSparkline data={dailyHistory} color='#1f89ee' />
          </View>

          <View style={[styles.statCard, styles.statStreak]}>
            <View style={[styles.statIconBg, { backgroundColor: '#FEF9EC' }]}>
              <Text style={styles.statIcon}>🔥</Text>
            </View>
            <Text style={[styles.statValue, { color: '#ffb724' }]}>
              {streak}
            </Text>
            <Text style={styles.statLabel}>Day Streak</Text>
            <Text style={styles.statSubtext}>Keep it going!</Text>
          </View>

          <View style={[styles.statCard, styles.statBest]}>
            <View style={[styles.statIconBg, { backgroundColor: '#EFF6FF' }]}>
              <Text style={styles.statIcon}>⚡</Text>
            </View>
            <Text style={[styles.statValue, { color: '#1f89ee' }]}>
              {weekTpm}
            </Text>
            <Text style={styles.statLabel}>Touches/Min</Text>
            <Text style={styles.statSubtext}>{getTpmLabel(weekTpm)}</Text>
            <MiniSparkline data={dailyHistory} color='#1f89ee' />
          </View>

          <View style={[styles.statCard, styles.statAvg]}>
            <View style={[styles.statIconBg, { backgroundColor: '#FEF9EC' }]}>
              <Text style={styles.statIcon}>⚽</Text>
            </View>
            <Text style={[styles.statValue, { color: '#ffb724' }]}>
              {challengeStreak}
            </Text>
            <Text style={styles.statLabel}>Challenge Streak</Text>
            <Text style={styles.statSubtext}>
              {challengeStreak === 0
                ? "Do today's challenge!"
                : 'Days in a row'}
            </Text>
          </View>

          {winStreak > 0 && (
            <View style={[styles.statCard, styles.statWinStreak]}>
              <View style={[styles.statIconBg, { backgroundColor: '#FEF9EC' }]}>
                <Text style={styles.statIcon}>⚔️</Text>
              </View>
              <Text style={[styles.statValue, { color: '#ffb724' }]}>
                {winStreak}
              </Text>
              <Text style={styles.statLabel}>1v1 Win Streak</Text>
              <Text style={styles.statSubtext}>{"Don't lose it!"}</Text>
            </View>
          )}
        </View>

        {/* RECENT SESSIONS */}
        {recentSessions.length > 0 && (
          <View style={styles.recentCard}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentLabel}>Recent Sessions</Text>
              <Pressable onPress={() => router.push('/(tabs)/progress')}>
                <Text style={styles.seeAll}>See all →</Text>
              </Pressable>
            </View>
            {recentSessions.map((s, i) => (
              <View
                key={s.id}
                style={[
                  styles.recentRow,
                  i < recentSessions.length - 1 && styles.recentRowBorder,
                ]}
              >
                <View style={styles.recentLeft}>
                  <Text style={styles.recentDate}>
                    {formatSessionDate(s.date)}
                  </Text>
                  {s.drill_name && (
                    <Text style={styles.recentDrill}>{s.drill_name}</Text>
                  )}
                </View>
                <Text style={styles.recentTouches}>
                  {s.touches_logged.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  coinNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#3ab86a',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#31af4d',
  },
  coinNoticeEmoji: {
    fontSize: 24,
  },
  coinNoticeText: {
    flex: 1,
    gap: 2,
  },
  coinNoticeTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  coinNoticeNote: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  coinNoticeDismiss: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // STATS GRID (2x2)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statWeek: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 4,
    borderTopColor: '#1f89ee',
  },
  statStreak: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 4,
    borderTopColor: '#ffb724',
  },
  statBest: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 4,
    borderTopColor: '#1f89ee',
  },
  statAvg: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 4,
    borderTopColor: '#ffb724',
  },
  statWinStreak: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 4,
    borderTopColor: '#ffb724',
    width: '100%',
  },
  statIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 18,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
  },

  // TODAY'S PROGRESS
  todayCard: {
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
  todaySectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0,
  },
  todayDoneBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: '#31af4d',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayRingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  todayRingMeta: {
    flex: 1,
  },
  todayCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  todayTouches: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  todayTarget: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    marginLeft: 2,
  },
  todaySubtext: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  // RECENT SESSIONS
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: 0,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  recentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  recentLeft: {
    flex: 1,
  },
  recentDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  recentDrill: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
  recentTouches: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1f89ee',
  },
});
