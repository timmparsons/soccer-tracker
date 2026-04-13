import CoinAwardBanner from '@/components/common/CoinAwardBanner';
import PageHeader from '@/components/common/PageHeader';
import VinnieCard from '@/components/common/VinnieCard';
import { useProfile } from '@/hooks/useProfile';
import { useChallengeStats, useRecentSessions, useTouchTracking } from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { getDisplayName } from '@/utils/getDisplayName';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const [banner, setBanner] = useState<{ amount: number; note: string | null } | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    // Skip the first emission so we don't banner on app open
    mountedRef.current = false;
    const timer = setTimeout(() => { mountedRef.current = true; }, 2000);

    const channel = supabase
      .channel(`coin-awards-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'coin_transactions', filter: `player_id=eq.${user.id}` },
        (payload) => {
          if (!mountedRef.current) return;
          const { amount, note } = payload.new as { amount: number; note: string | null };
          setBanner({ amount, note });
          queryClient.invalidateQueries({ queryKey: ['coins', user.id] });
          queryClient.invalidateQueries({ queryKey: ['coin-transactions', user.id] });
        },
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const {
    data: touchStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useTouchTracking(user?.id);

  const { data: challengeStats, refetch: refetchChallengeStats } =
    useChallengeStats(user?.id, undefined);

  const { data: recentSessions = [], refetch: refetchRecent } = useRecentSessions(user?.id, 3);

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
  const todayTouches = touchStats?.today_touches || 0;
  const dailyTarget = touchStats?.daily_target || 1000;
  const todayPct = Math.min((todayTouches / dailyTarget) * 100, 100);
  const todayDone = todayTouches >= dailyTarget;

  const formatSessionDate = (dateStr: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const d = new Date(dateStr + 'T00:00:00');
    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
      {banner && (
        <CoinAwardBanner
          amount={banner.amount}
          note={banner.note}
          onDismiss={() => setBanner(null)}
        />
      )}
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
          challengeStreak={challengeStreak}
        />

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
              {challengeStreak === 0 ? "Do today's challenge!" : 'Days in a row'}
            </Text>
          </View>
        </View>

        {/* TODAY'S PROGRESS */}
        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <Text style={styles.todaySectionLabel}>TODAY'S PROGRESS</Text>
            {todayDone && <Text style={styles.todayDoneBadge}>✓ Goal hit!</Text>}
          </View>
          <View style={styles.todayRow}>
            <Text style={styles.todayTouches}>{todayTouches.toLocaleString()}</Text>
            <Text style={styles.todayTarget}> / {dailyTarget.toLocaleString()}</Text>
          </View>
          <View style={styles.todayBarBg}>
            <View style={[styles.todayBarFill, { width: `${todayPct}%` as `${number}%` }]} />
          </View>
          <Text style={styles.todaySubtext}>
            {todayDone
              ? 'Smashed it — keep going if you want more!'
              : `${(dailyTarget - todayTouches).toLocaleString()} touches to reach your goal`}
          </Text>
        </View>

        {/* RECENT SESSIONS */}
        {recentSessions.length > 0 && (
          <View style={styles.recentCard}>
            <Text style={styles.recentLabel}>RECENT SESSIONS</Text>
            {recentSessions.map((s, i) => (
              <View key={s.id} style={[styles.recentRow, i < recentSessions.length - 1 && styles.recentRowBorder]}>
                <View style={styles.recentLeft}>
                  <Text style={styles.recentDate}>{formatSessionDate(s.date)}</Text>
                  {s.drill_name && <Text style={styles.recentDrill}>{s.drill_name}</Text>}
                </View>
                <Text style={styles.recentTouches}>{s.touches_logged.toLocaleString()}</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  todaySectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1f89ee',
    letterSpacing: 1.2,
  },
  todayDoneBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#31af4d',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  todayTouches: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  todayTarget: {
    fontSize: 16,
    fontWeight: '700',
    color: '#78909C',
  },
  todayBarBg: {
    height: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  todayBarFill: {
    height: 8,
    backgroundColor: '#1f89ee',
    borderRadius: 4,
  },
  todaySubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },

  // RECENT SESSIONS
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recentLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1f89ee',
    letterSpacing: 1.2,
    marginBottom: 12,
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
