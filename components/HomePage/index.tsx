import PageHeader from '@/components/common/PageHeader';
import VinnieCard from '@/components/common/VinnieCard';
import ChallengesCard from '@/components/HomePage/ChallengesCard';
import { useProfile } from '@/hooks/useProfile';
import { useChallengeStats, useTouchTracking } from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { getDisplayName } from '@/utils/getDisplayName';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
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
      queryClient.invalidateQueries({ queryKey: ['player-challenges'] }),
    ]);
    setRefreshing(false);
  }, [refetchProfile, refetchStats, refetchChallengeStats, queryClient]);

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchStats();
      refetchChallengeStats();
      queryClient.invalidateQueries({ queryKey: ['player-challenges'] });
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
  const weekTouches = touchStats?.this_week_touches || 0;
  const streak = touchStats?.current_streak || 0;
  const weekTpm = touchStats?.this_week_tpm || 0;
  const challengeStreak = challengeStats?.challengeStreak || 0;

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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor='#1f89ee' />
        }
      >
        {/* VINNIE */}
        <VinnieCard
          trainedToday={(touchStats?.today_touches || 0) > 0}
          streak={streak}
        />

        {/* PLAYER CHALLENGES */}
        {user?.id && <ChallengesCard userId={user.id} teamId={profile?.team_id} />}

        {/* QUICK STATS */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statWeek]}>
            <View style={[styles.statIconBg, { backgroundColor: '#DBEAFE' }]}>
              <Text style={styles.statIcon}>📊</Text>
            </View>
            <Text style={[styles.statValue, { color: '#1f89ee' }]}>
              {weekTouches.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statSubtext}>Resets Sunday</Text>
          </View>

          <View style={[styles.statCard, styles.statStreak]}>
            <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.statIcon}>🔥</Text>
            </View>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {streak}
            </Text>
            <Text style={styles.statLabel}>Day Streak</Text>
            <Text style={styles.statSubtext}>Keep it going!</Text>
          </View>

          <View style={[styles.statCard, styles.statBest]}>
            <View style={[styles.statIconBg, { backgroundColor: '#FFE4DC' }]}>
              <Text style={styles.statIcon}>⚡</Text>
            </View>
            <Text style={[styles.statValue, { color: '#ffb724' }]}>
              {weekTpm}
            </Text>
            <Text style={styles.statLabel}>Touches/Min</Text>
            <Text style={styles.statSubtext}>{getTpmLabel(weekTpm)}</Text>
          </View>

          <View style={[styles.statCard, styles.statAvg]}>
            <View style={[styles.statIconBg, { backgroundColor: '#D1FAE5' }]}>
              <Text style={styles.statIcon}>⚽</Text>
            </View>
            <Text style={[styles.statValue, { color: '#31af4d' }]}>
              {challengeStreak}
            </Text>
            <Text style={styles.statLabel}>Challenge Streak</Text>
            <Text style={styles.statSubtext}>
              {challengeStreak === 0 ? "Do today's challenge!" : 'Days in a row'}
            </Text>
          </View>
        </View>
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
    backgroundColor: '#F5F7FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 16,
  },

  // STATS GRID (2x2)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    padding: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statWeek: {
    backgroundColor: '#F0F8FF',
    borderTopWidth: 4,
    borderTopColor: '#1f89ee',
  },
  statStreak: {
    backgroundColor: '#FFFBF0',
    borderTopWidth: 4,
    borderTopColor: '#F59E0B',
  },
  statBest: {
    backgroundColor: '#FFF8F6',
    borderTopWidth: 4,
    borderTopColor: '#ffb724',
  },
  statAvg: {
    backgroundColor: '#F0FDF9',
    borderTopWidth: 4,
    borderTopColor: '#31af4d',
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
});
