import PageHeader from '@/components/common/PageHeader';
import { useProfile } from '@/hooks/useProfile';
import { useChallengeStats, useRecentSessions } from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const ProgressPage = () => {
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month'>('week');
  const queryClient = useQueryClient();

  // Refetch all data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['recent-sessions', user.id] });
        queryClient.invalidateQueries({ queryKey: ['chart-stats', user.id] });
        queryClient.invalidateQueries({ queryKey: ['quick-stats', user.id] });
        queryClient.invalidateQueries({ queryKey: ['lifetime-achievements', user.id] });
      }
    }, [user?.id, queryClient])
  );

  // Get recent sessions
  const { data: recentSessions, isLoading: sessionsLoading } = useRecentSessions(user?.id, 10);

  // Get challenge stats for badges
  const { data: challengeStats } = useChallengeStats(user?.id, null);

  // Get chart data
  const { data: chartStats } = useQuery({
    queryKey: ['chart-stats', user?.id, timeFilter],
    enabled: !!user?.id,
    queryFn: async () => {
      const today = new Date();
      const daysToFetch = timeFilter === 'week' ? 7 : 28;
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - daysToFetch + 1);

      const { data: sessions } = await supabase
        .from('daily_sessions')
        .select('touches_logged, date')
        .eq('user_id', user!.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      // Group by date
      const byDate: Record<string, number> = {};
      sessions?.forEach(s => {
        byDate[s.date] = (byDate[s.date] || 0) + s.touches_logged;
      });

      if (timeFilter === 'week') {
        const labels: string[] = [];
        const data: number[] = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 0; i < 7; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          labels.push(dayNames[d.getDay()]);
          data.push(byDate[dateStr] || 0);
        }
        return { labels, data };
      } else {
        // Monthly - group by week
        const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        const data = [0, 0, 0, 0];

        for (let i = 0; i < 28; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          const weekIndex = Math.floor(i / 7);
          data[weekIndex] += byDate[dateStr] || 0;
        }
        return { labels, data };
      }
    },
  });

  // Get quick stats
  const { data: quickStats } = useQuery({
    queryKey: ['quick-stats', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: sessions } = await supabase
        .from('daily_sessions')
        .select('touches_logged, duration_minutes, date')
        .eq('user_id', user!.id)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0]);

      if (!sessions || sessions.length === 0) {
        return { bestDay: 0, dailyAvg: 0, daysHitTarget: 0, avgTpm: 0 };
      }

      // Group by date
      const byDate: Record<string, number> = {};
      sessions.forEach(s => {
        byDate[s.date] = (byDate[s.date] || 0) + s.touches_logged;
      });

      const dailyTotals = Object.values(byDate);
      const bestDay = Math.max(...dailyTotals, 0);
      const dailyAvg = Math.round(dailyTotals.reduce((a, b) => a + b, 0) / 7);
      const daysHitTarget = dailyTotals.filter(t => t >= 1000).length;

      // Calculate average TPM
      const totalTouches = sessions.reduce((sum, s) => sum + s.touches_logged, 0);
      const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      const avgTpm = totalMinutes > 0 ? Math.round(totalTouches / totalMinutes) : 0;

      return { bestDay, dailyAvg, daysHitTarget, avgTpm };
    },
  });

  // Get lifetime stats for achievements
  const { data: lifetimeStats } = useQuery({
    queryKey: ['lifetime-achievements', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: sessions } = await supabase
        .from('daily_sessions')
        .select('touches_logged, date')
        .eq('user_id', user!.id);

      if (!sessions) return { totalTouches: 0, totalSessions: 0, bestDayEver: 0, longestStreak: 0 };

      const byDate: Record<string, number> = {};
      sessions.forEach(s => {
        byDate[s.date] = (byDate[s.date] || 0) + s.touches_logged;
      });

      const dailyTotals = Object.values(byDate);
      const totalTouches = sessions.reduce((sum, s) => sum + s.touches_logged, 0);
      const bestDayEver = Math.max(...dailyTotals, 0);

      // Calculate longest streak
      const dates = Object.keys(byDate).sort();
      let longestStreak = dates.length > 0 ? 1 : 0;
      let currentStreak = 1;

      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 1;
        }
      }

      return { totalTouches, totalSessions: sessions.length, bestDayEver, longestStreak };
    },
  });

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Build achievements based on real data
  const achievements = [
    {
      id: '1',
      title: '1,000 Touch Day',
      description: 'Hit 1,000 touches in a single day',
      icon: '🏆',
      unlocked: (lifetimeStats?.bestDayEver || 0) >= 1000,
      progress: Math.min(lifetimeStats?.bestDayEver || 0, 1000),
      total: 1000,
    },
    {
      id: '2',
      title: 'Week Warrior',
      description: 'Practice every day for 7 days straight',
      icon: '⚔️',
      unlocked: (lifetimeStats?.longestStreak || 0) >= 7,
      progress: Math.min(lifetimeStats?.longestStreak || 0, 7),
      total: 7,
    },
    {
      id: '3',
      title: 'Century Master',
      description: 'Complete 100 training sessions',
      icon: '💯',
      unlocked: (lifetimeStats?.totalSessions || 0) >= 100,
      progress: Math.min(lifetimeStats?.totalSessions || 0, 100),
      total: 100,
    },
    {
      id: '4',
      title: 'Marathon Player',
      description: 'Log 100,000 lifetime touches',
      icon: '🎖️',
      unlocked: (lifetimeStats?.totalTouches || 0) >= 100000,
      progress: Math.min(lifetimeStats?.totalTouches || 0, 100000),
      total: 100000,
    },
    {
      id: '5',
      title: 'Challenge Streak',
      description: 'Complete challenges 7 days in a row',
      icon: '🗓️',
      unlocked: (challengeStats?.challengeStreak || 0) >= 7,
      progress: Math.min(challengeStats?.challengeStreak || 0, 7),
      total: 7,
    },
    {
      id: '6',
      title: 'Drill Explorer',
      description: 'Complete every type of drill at least once',
      icon: '🔍',
      unlocked:
        (challengeStats?.totalDrillsAvailable || 0) > 0 &&
        (challengeStats?.uniqueDrillsCompleted || 0) >= (challengeStats?.totalDrillsAvailable || 1),
      progress: challengeStats?.uniqueDrillsCompleted || 0,
      total: challengeStats?.totalDrillsAvailable || 1,
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const chartData = {
    labels: chartStats?.labels || (timeFilter === 'week' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Week 1', 'Week 2', 'Week 3', 'Week 4']),
    datasets: [
      {
        data: chartStats?.data?.length ? chartStats.data : [0],
        color: (opacity = 1) => `rgba(43, 159, 255, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title='Progress'
        showAvatar={true}
        avatarUrl={profile?.avatar_url}
        rightComponent={
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                timeFilter === 'week' && styles.filterButtonActive,
              ]}
              onPress={() => setTimeFilter('week')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  timeFilter === 'week' && styles.filterButtonTextActive,
                ]}
              >
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                timeFilter === 'month' && styles.filterButtonActive,
              ]}
              onPress={() => setTimeFilter('month')}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  timeFilter === 'month' && styles.filterButtonTextActive,
                ]}
              >
                Month
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Chart Card */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>
              {timeFilter === 'week' ? 'This Week' : 'This Month'}
            </Text>
            <View style={styles.chartLegend}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Touches</Text>
            </View>
          </View>

          <LineChart
            data={chartData}
            width={screenWidth - 80}
            height={220}
            chartConfig={{
              backgroundColor: '#FFF',
              backgroundGradientFrom: '#FFF',
              backgroundGradientTo: '#FFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(43, 159, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(120, 144, 156, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#2B9FFF',
              },
              propsForBackgroundLines: {
                strokeDasharray: '',
                stroke: '#F5F7FA',
              },
            }}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            withDots={true}
            withShadow={false}
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStatsCard}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statEmoji}>📈</Text>
              <Text style={styles.statValue}>{(quickStats?.bestDay || 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>Best Day</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statEmoji}>📊</Text>
              <Text style={styles.statValue}>{(quickStats?.dailyAvg || 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>Daily Avg</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statEmoji}>⚡</Text>
              <Text style={styles.statValue}>{quickStats?.avgTpm || 0}</Text>
              <Text style={styles.statLabel}>Tempo</Text>
            </View>
          </View>
          {(quickStats?.avgTpm || 0) > 0 && (
            <View style={styles.tpmHint}>
              <Text style={styles.tpmHintText}>
                {(quickStats?.avgTpm || 0) < 30
                  ? '💡 Try practicing faster - aim for game speed!'
                  : (quickStats?.avgTpm || 0) < 50
                  ? '👍 Good pace! Push for 50+ touches/min'
                  : (quickStats?.avgTpm || 0) < 80
                  ? '🔥 Great tempo! You\'re training at game speed'
                  : '⚡ Elite intensity! Keep it up!'}
              </Text>
            </View>
          )}
        </View>

        {/* Session History */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
          </View>

          {sessionsLoading ? (
            <ActivityIndicator size="small" color="#2B9FFF" style={{ marginVertical: 20 }} />
          ) : recentSessions && recentSessions.length > 0 ? (
            recentSessions.map((session) => (
              <View key={session.id} style={styles.sessionItem}>
                <View style={styles.sessionLeft}>
                  <View style={styles.sessionIconBg}>
                    <Text style={styles.sessionEmoji}>⚽</Text>
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionName}>{session.drill_name || 'Free Practice'}</Text>
                    <View style={styles.sessionMeta}>
                      <Text style={styles.sessionTime}>{formatTimeAgo(session.created_at)}</Text>
                      {session.duration_minutes && (
                        <>
                          <Text style={styles.sessionDot}>•</Text>
                          <Text style={styles.sessionDuration}>
                            {session.duration_minutes} min
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.sessionRight}>
                  <Text style={styles.sessionTouches}>{session.touches_logged.toLocaleString()}</Text>
                  <Text style={styles.sessionTouchesLabel}>touches</Text>
                  {session.duration_minutes && session.duration_minutes > 0 && (
                    <Text style={styles.sessionTpm}>
                      ⚡ {Math.round(session.touches_logged / session.duration_minutes)}/min
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ color: '#78909C', fontWeight: '600' }}>No sessions yet. Start training!</Text>
            </View>
          )}
        </View>

        {/* Achievements */}
        <View style={styles.achievementsCard}>
          <View style={styles.achievementsHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <View style={styles.achievementsBadge}>
              <Text style={styles.achievementsBadgeText}>{unlockedCount}/{achievements.length} Unlocked</Text>
            </View>
          </View>

          {achievements.map((achievement) => (
            <View
              key={achievement.id}
              style={[
                styles.achievementItem,
                !achievement.unlocked && styles.achievementLocked,
              ]}
            >
              <View style={styles.achievementIconBg}>
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              </View>
              <View style={styles.achievementInfo}>
                <Text
                  style={[
                    styles.achievementTitle,
                    !achievement.unlocked && styles.achievementTitleLocked,
                  ]}
                >
                  {achievement.title}
                </Text>
                <Text style={styles.achievementDescription}>
                  {achievement.description}
                </Text>
                {achievement.unlocked ? (
                  <View style={styles.achievementUnlockedBadge}>
                    <Ionicons
                      name='checkmark-circle'
                      size={14}
                      color='#388E3C'
                    />
                    <Text style={styles.achievementUnlockedText}>
                      Unlocked!
                    </Text>
                  </View>
                ) : (
                  <View style={styles.achievementProgress}>
                    <View style={styles.achievementProgressBar}>
                      <View
                        style={[
                          styles.achievementProgressFill,
                          {
                            width: `${
                              (achievement.progress / achievement.total) * 100
                            }%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.achievementProgressText}>
                      {achievement.progress.toLocaleString()}/{achievement.total.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default ProgressPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // FILTER
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#2B9FFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },

  // CHART CARD
  chartCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2B9FFF',
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },

  // QUICK STATS
  quickStatsCard: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78909C',
    textAlign: 'center',
  },
  tpmHint: {
    marginTop: 16,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 12,
  },
  tpmHintText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1976D2',
    textAlign: 'center',
  },

  // SESSION HISTORY
  historyCard: {
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
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B9FFF',
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sessionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionEmoji: {
    fontSize: 20,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionTime: {
    fontSize: 12,
    color: '#78909C',
    fontWeight: '600',
  },
  sessionDot: {
    fontSize: 12,
    color: '#B0BEC5',
  },
  sessionDuration: {
    fontSize: 12,
    color: '#78909C',
    fontWeight: '600',
  },
  sessionRight: {
    alignItems: 'flex-end',
  },
  sessionTouches: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2B9FFF',
    marginBottom: 2,
  },
  sessionTouchesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78909C',
    textTransform: 'uppercase',
  },
  sessionTpm: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF9800',
    marginTop: 4,
  },

  // ACHIEVEMENTS
  achievementsCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementsBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  achievementsBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#388E3C',
  },
  achievementItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementIcon: {
    fontSize: 28,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  achievementTitleLocked: {
    color: '#78909C',
  },
  achievementDescription: {
    fontSize: 13,
    color: '#78909C',
    fontWeight: '600',
    marginBottom: 8,
  },
  achievementUnlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  achievementUnlockedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#388E3C',
  },
  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  achievementProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: '#FFB74D',
    borderRadius: 3,
  },
  achievementProgressText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78909C',
  },
});
