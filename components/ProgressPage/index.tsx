import PageHeader from '@/components/common/PageHeader';
import VinnieCelebrationModal from '@/components/modals/VinnieCelebrationModal';
import { usePremium } from '@/hooks/usePremium';
import { useProfile } from '@/hooks/useProfile';
import {
  useChallengeStats,
  useRecentSessions,
  useTouchTracking,
} from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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

// Track which milestones have been celebrated this app session
const shownMilestones = new Set<number>();

const ProgressPage = () => {
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const { isPremium } = usePremium();
  console.log('qqq', isPremium);
  const router = useRouter();
  const [timeFilter, setTimeFilter] = useState<'week' | 'month'>('week');
  const [showVinnieMilestone, setShowVinnieMilestone] = useState(false);
  const [milestoneMessage, setMilestoneMessage] = useState('');
  const [milestoneStreak, setMilestoneStreak] = useState(0);
  const queryClient = useQueryClient();

  // Refetch all data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: ['recent-sessions', user.id],
        });
        queryClient.invalidateQueries({ queryKey: ['chart-stats', user.id] });
        queryClient.invalidateQueries({ queryKey: ['quick-stats', user.id] });
        queryClient.invalidateQueries({
          queryKey: ['lifetime-achievements', user.id],
        });
      }
    }, [user?.id, queryClient]),
  );

  // Get recent sessions
  const { data: recentSessions, isLoading: sessionsLoading } =
    useRecentSessions(user?.id, 10);

  // Get challenge stats for badges
  const { data: challengeStats } = useChallengeStats(user?.id, null);

  // Get touch stats for streak milestone detection
  const { data: touchStats } = useTouchTracking(user?.id);

  useEffect(() => {
    const streak = touchStats?.current_streak || 0;
    const trainedToday = (touchStats?.today_touches || 0) > 0;
    if (!trainedToday || streak === 0) return;

    const milestone = VINNIE_STREAK_MILESTONES.find((m) => m === streak);
    if (milestone && !shownMilestones.has(milestone)) {
      shownMilestones.add(milestone);
      setMilestoneStreak(milestone);
      setMilestoneMessage(VINNIE_STREAK_MESSAGES[milestone]);
      setShowVinnieMilestone(true);
    }
  }, [touchStats?.current_streak, touchStats?.today_touches]);

  // Get chart data
  const { data: chartStats } = useQuery({
    queryKey: ['chart-stats', user?.id, timeFilter, getLocalDate()],
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
        .gte('date', getLocalDate(startDate))
        .order('date', { ascending: true });

      // Group by date
      const byDate: Record<string, number> = {};
      sessions?.forEach((s) => {
        byDate[s.date] = (byDate[s.date] || 0) + s.touches_logged;
      });

      if (timeFilter === 'week') {
        const labels: string[] = [];
        const data: number[] = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 0; i < 7; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + i);
          const dateStr = getLocalDate(d);
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
          const dateStr = getLocalDate(d);
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
        .gte('date', getLocalDate(sevenDaysAgo));

      if (!sessions || sessions.length === 0) {
        return { bestDay: 0, dailyAvg: 0, daysHitTarget: 0, avgTpm: 0 };
      }

      // Group by date
      const byDate: Record<string, number> = {};
      sessions.forEach((s) => {
        byDate[s.date] = (byDate[s.date] || 0) + s.touches_logged;
      });

      const dailyTotals = Object.values(byDate);
      const bestDay = Math.max(...dailyTotals, 0);
      const dailyAvg = Math.round(dailyTotals.reduce((a, b) => a + b, 0) / 7);
      const daysHitTarget = dailyTotals.filter((t) => t >= 1000).length;

      // Calculate average TPM
      const totalTouches = sessions.reduce(
        (sum, s) => sum + s.touches_logged,
        0,
      );
      const totalMinutes = sessions.reduce(
        (sum, s) => sum + (s.duration_minutes || 0),
        0,
      );
      const avgTpm =
        totalMinutes > 0 ? Math.round(totalTouches / totalMinutes) : 0;

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

      if (!sessions)
        return {
          totalTouches: 0,
          totalSessions: 0,
          bestDayEver: 0,
          longestStreak: 0,
        };

      const byDate: Record<string, number> = {};
      sessions.forEach((s) => {
        byDate[s.date] = (byDate[s.date] || 0) + s.touches_logged;
      });

      const dailyTotals = Object.values(byDate);
      const totalTouches = sessions.reduce(
        (sum, s) => sum + s.touches_logged,
        0,
      );
      const bestDayEver = Math.max(...dailyTotals, 0);

      // Calculate longest streak
      const dates = Object.keys(byDate).sort();
      let longestStreak = dates.length > 0 ? 1 : 0;
      let currentStreak = 1;

      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diffDays = Math.floor(
          (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays === 1) {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 1;
        }
      }

      return {
        totalTouches,
        totalSessions: sessions.length,
        bestDayEver,
        longestStreak,
      };
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
        (challengeStats?.uniqueDrillsCompleted || 0) >=
          (challengeStats?.totalDrillsAvailable || 1),
      progress: challengeStats?.uniqueDrillsCompleted || 0,
      total: challengeStats?.totalDrillsAvailable || 1,
    },
  ];

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const chartData = {
    labels:
      chartStats?.labels ||
      (timeFilter === 'week'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : ['Week 1', 'Week 2', 'Week 3', 'Week 4']),
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
              onPress={() => {
                if (!isPremium) {
                  router.push('/(modals)/paywall');
                  return;
                }
                setTimeFilter('month');
              }}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  timeFilter === 'month' && styles.filterButtonTextActive,
                ]}
              >
                Month{!isPremium ? ' 🔒' : ''}
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
                stroke: '#1f89ee',
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
              <Text style={styles.statValue}>
                {(quickStats?.bestDay || 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Best Day</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statEmoji}>📊</Text>
              <Text style={styles.statValue}>
                {(quickStats?.dailyAvg || 0).toLocaleString()}
              </Text>
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
                      ? "🔥 Great tempo! You're training at game speed"
                      : '⚡ Elite intensity! Keep it up!'}
              </Text>
            </View>
          )}
        </View>

        {/* Session History */}
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            {!isPremium && (
              <TouchableOpacity
                onPress={() => router.push('/(modals)/paywall')}
              >
                <Text style={styles.viewAllText}>See all · Pro 🔒</Text>
              </TouchableOpacity>
            )}
          </View>

          {sessionsLoading ? (
            <ActivityIndicator
              size='small'
              color='#1f89ee'
              style={{ marginVertical: 20 }}
            />
          ) : recentSessions && recentSessions.length > 0 ? (
            (isPremium ? recentSessions : recentSessions.slice(0, 3)).map(
              (session) => (
                <View key={session.id} style={styles.sessionItem}>
                  <View style={styles.sessionLeft}>
                    <View style={styles.sessionIconBg}>
                      <Text style={styles.sessionEmoji}>⚽</Text>
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionName}>
                        {session.drill_name || 'Free Practice'}
                      </Text>
                      <View style={styles.sessionMeta}>
                        <Text style={styles.sessionTime}>
                          {formatTimeAgo(session.created_at)}
                        </Text>
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
                    <Text style={styles.sessionTouches}>
                      {session.touches_logged.toLocaleString()}
                    </Text>
                    <Text style={styles.sessionTouchesLabel}>touches</Text>
                    {session.duration_minutes &&
                      session.duration_minutes > 0 && (
                        <Text style={styles.sessionTpm}>
                          ⚡{' '}
                          {Math.round(
                            session.touches_logged / session.duration_minutes,
                          )}
                          /min
                        </Text>
                      )}
                  </View>
                </View>
              ),
            )
          ) : (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ color: '#78909C', fontWeight: '600' }}>
                No sessions yet. Start training!
              </Text>
            </View>
          )}
        </View>

        {/* Trophy Cabinet */}
        <View style={styles.cabinetCard}>
          <View style={styles.cabinetHeader}>
            <View>
              <Text style={styles.cabinetLabel}>TROPHY CABINET</Text>
              <Text style={styles.cabinetTitle}>
                {unlockedCount === 0
                  ? 'Start earning trophies'
                  : unlockedCount === achievements.length
                  ? 'Full collection! 🎉'
                  : `${unlockedCount} of ${achievements.length} earned`}
              </Text>
            </View>
            <View style={styles.cabinetBadge}>
              <Text style={styles.cabinetBadgeText}>{unlockedCount}/{achievements.length}</Text>
            </View>
          </View>

          <View style={styles.trophyGrid}>
            {achievements.map((achievement, index) => {
              const isGated = !isPremium && index >= 3;
              if (isGated) {
                return (
                  <TouchableOpacity
                    key={achievement.id}
                    style={styles.trophyLocked}
                    activeOpacity={0.7}
                    onPress={() => router.push('/(modals)/paywall')}
                  >
                    <View style={styles.trophyIconRingLocked}>
                      <Text style={[styles.trophyEmoji, { opacity: 0.12 }]}>
                        {achievement.icon}
                      </Text>
                      <View style={styles.lockOverlay}>
                        <Ionicons name='lock-closed' size={22} color='rgba(255,255,255,0.45)' />
                      </View>
                    </View>
                    <Text style={styles.trophyNameLocked} numberOfLines={2}>
                      {achievement.title}
                    </Text>
                    <View style={[styles.lockedProgressBar, { backgroundColor: '#1f89ee33' }]}>
                      <View style={[styles.lockedProgressFill, { width: '0%', backgroundColor: '#1f89ee' }]} />
                    </View>
                    <Text style={[styles.lockedProgressText, { color: '#1f89ee' }]}>Pro only</Text>
                  </TouchableOpacity>
                );
              }
              return achievement.unlocked ? (
                <View key={achievement.id} style={styles.trophyUnlocked}>
                  <View style={styles.trophyIconRingUnlocked}>
                    <Text style={styles.trophyEmoji}>{achievement.icon}</Text>
                  </View>
                  <Text style={styles.trophyNameUnlocked} numberOfLines={2}>
                    {achievement.title}
                  </Text>
                  <View style={styles.earnedBadge}>
                    <Ionicons name='checkmark' size={10} color='#065F46' />
                    <Text style={styles.earnedText}>EARNED</Text>
                  </View>
                </View>
              ) : (
                <View key={achievement.id} style={styles.trophyLocked}>
                  <View style={styles.trophyIconRingLocked}>
                    <Text style={[styles.trophyEmoji, { opacity: 0.12 }]}>
                      {achievement.icon}
                    </Text>
                    <View style={styles.lockOverlay}>
                      <Ionicons name='lock-closed' size={22} color='rgba(255,255,255,0.45)' />
                    </View>
                  </View>
                  <Text style={styles.trophyNameLocked} numberOfLines={2}>
                    {achievement.title}
                  </Text>
                  <View style={styles.lockedProgressBar}>
                    <View
                      style={[
                        styles.lockedProgressFill,
                        { width: `${Math.min((achievement.progress / achievement.total) * 100, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.lockedProgressText}>
                    {achievement.progress.toLocaleString()}/{achievement.total.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Vinnie streak milestone celebration */}
      <VinnieCelebrationModal
        visible={showVinnieMilestone}
        touchCount={milestoneStreak}
        streak={milestoneStreak}
        overrideMessage={milestoneMessage}
        onClose={() => setShowVinnieMilestone(false)}
      />
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
    backgroundColor: '#1f89ee',
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
    backgroundColor: '#1f89ee',
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
    color: '#1f89ee',
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
    color: '#1f89ee',
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

  // TROPHY CABINET
  cabinetCard: {
    backgroundColor: '#1E1A3A',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#1E1A3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cabinetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  cabinetLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A78BFA',
    letterSpacing: 2,
    marginBottom: 4,
  },
  cabinetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  cabinetBadge: {
    backgroundColor: '#312E81',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  cabinetBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#C7D2FE',
  },
  trophyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  trophyUnlocked: {
    width: '47.5%',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  trophyLocked: {
    width: '47.5%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  trophyIconRingUnlocked: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  trophyIconRingLocked: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  trophyEmoji: {
    fontSize: 30,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 26, 58, 0.65)',
    borderRadius: 32,
  },
  trophyNameUnlocked: {
    fontSize: 12,
    fontWeight: '900',
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 10,
  },
  trophyNameLocked: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.28)',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 8,
  },
  earnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  earnedText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#065F46',
    letterSpacing: 0.8,
  },
  lockedProgressBar: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 5,
  },
  lockedProgressFill: {
    height: '100%',
    backgroundColor: 'rgba(167,139,250,0.6)',
    borderRadius: 2,
  },
  lockedProgressText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.22)',
  },
});
