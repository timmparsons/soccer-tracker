import ActivityFeed from '@/components/HomePage/ActivityFeed';
import TodayChallengeCard from '@/components/HomePage/TodayChallengeCard';
import CircularProgress from '@/components/common/CircularProgress';
import PageHeader from '@/components/common/PageHeader';
import VinnieCard from '@/components/common/VinnieCard';
import { useProfile } from '@/hooks/useProfile';
import {
  useChallengeStats,
  useTouchTracking,
} from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { getDisplayName } from '@/utils/getDisplayName';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchProfile(),
      refetchStats(),
      refetchChallengeStats(),
      queryClient.invalidateQueries({ queryKey: ['team-activity'] }),
    ]);
    setRefreshing(false);
  }, [refetchProfile, refetchStats, refetchChallengeStats, queryClient]);

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchStats();
      refetchChallengeStats();
      queryClient.invalidateQueries({ queryKey: ['team-activity'] });
    }, [refetchProfile, refetchStats, refetchChallengeStats, queryClient]),
  );

  if (statsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#1f89ee' />
      </View>
    );
  }

  const displayName = getDisplayName(profile);
  const streak = touchStats?.current_streak || 0;
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

        {/* TODAY'S CHALLENGE */}
        {!profile?.is_coach && user?.id && (
          <TodayChallengeCard
            userId={user.id}
            totalTouches={touchStats?.total_touches ?? 0}
            onStartChallenge={(drillId, durationMinutes, drillName, difficulty) => {
              router.push({
                pathname: '/(tabs)/train',
                params: {
                  startChallengeDrillId: drillId,
                  startChallengeDuration: String(durationMinutes),
                  startChallengeName: drillName,
                  startChallengeDifficulty: difficulty,
                },
              });
            }}
          />
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

        {/* TEAM ACTIVITY */}
        <ActivityFeed teamId={profile?.team_id} />

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
});
