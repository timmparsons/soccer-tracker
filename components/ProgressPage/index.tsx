import PageHeader from '@/components/common/PageHeader';
import VinnieCelebrationModal from '@/components/modals/VinnieCelebrationModal';
import { useSubscription } from '@/hooks/useSubscription';
import { useProfile } from '@/hooks/useProfile';
import { useRecentSessions, useTouchTracking, useFocusBreakdown } from '@/hooks/useTouchTracking';
import { FOCUS_LABELS } from '@/lib/trainingFocus';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { VINNIE_STREAK_MESSAGES, VINNIE_STREAK_MILESTONES } from '@/lib/vinnie';
import { getLocalDate } from '@/utils/getLocalDate';
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

const FOCUS_COLORS: Record<string, string> = {
  ball_mastery: '#1f89ee',
  turning: '#F59E0B',
  juggling: '#8B5CF6',
  one_v_one: '#31af4d',
  dribbling: '#EF4444',
  free_play: '#78909C',
};

// Track which milestones have been celebrated this app session
const shownMilestones = new Set<number>();

const ProgressPage = () => {
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const { isPremium } = useSubscription();
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
        queryClient.invalidateQueries({ queryKey: ['recent-sessions', user.id] });
        queryClient.invalidateQueries({ queryKey: ['chart-stats', user.id] });
        queryClient.invalidateQueries({ queryKey: ['focus-breakdown', user.id] });
      }
    }, [user?.id, queryClient]),
  );

  // Get recent sessions
  const { data: recentSessions, isLoading: sessionsLoading } =
    useRecentSessions(user?.id, 10);

  // Get training focus breakdown
  const { data: focusBreakdown = [] } = useFocusBreakdown(user?.id, timeFilter);

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

  const formatDay = (dateStr: string): string => {
    const today = getLocalDate();
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterday = getLocalDate(yesterdayObj);

    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';

    const d = new Date(dateStr + 'T00:00:00');
    const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
              style={[styles.filterButton, timeFilter === 'week' && styles.filterButtonActive]}
              onPress={() => setTimeFilter('week')}
            >
              <Text style={[styles.filterButtonText, timeFilter === 'week' && styles.filterButtonTextActive]}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, timeFilter === 'month' && styles.filterButtonActive]}
              onPress={() => {
                if (!isPremium) { router.push('/(modals)/paywall'); return; }
                setTimeFilter('month');
              }}
            >
              <Text style={[styles.filterButtonText, timeFilter === 'month' && styles.filterButtonTextActive]}>
                Month{!isPremium ? ' 🔒' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>

        {/* Training Breakdown */}
        {focusBreakdown.length > 0 && (() => {
          const total = focusBreakdown.reduce((sum, i) => sum + i.sessions, 0);
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Training Breakdown</Text>
              {focusBreakdown
                .slice()
                .sort((a, b) => b.sessions - a.sessions)
                .map(item => {
                  const pct = total > 0 ? Math.round((item.sessions / total) * 100) : 0;
                  const color = FOCUS_COLORS[item.key] ?? '#78909C';
                  return (
                    <View key={item.key} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{item.label}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                      </View>
                      <Text style={styles.breakdownPct}>{pct}%</Text>
                    </View>
                  );
                })}
            </View>
          );
        })()}

        {/* Touches By Focus */}
        {focusBreakdown.some(i => i.touches > 0) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Touches by Focus</Text>
            {focusBreakdown
              .filter(i => i.touches > 0)
              .sort((a, b) => b.touches - a.touches)
              .map(item => (
                <View key={item.key} style={styles.touchesRow}>
                  <View style={styles.touchesLeft}>
                    <View style={[styles.focusDot, { backgroundColor: FOCUS_COLORS[item.key] ?? '#78909C' }]} />
                    <Text style={styles.touchesLabel}>{item.label}</Text>
                  </View>
                  <Text style={styles.touchesValue}>{item.touches.toLocaleString()}</Text>
                </View>
              ))}
          </View>
        )}

        {/* Recent Training */}
        {sessionsLoading ? (
          <ActivityIndicator size='small' color='#1f89ee' style={{ marginVertical: 20 }} />
        ) : recentSessions && recentSessions.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Training</Text>
            {(() => {
              const list = isPremium ? recentSessions : recentSessions.slice(0, 5);
              return (
                <>
                  {list.map((session, index) => {
                    const color = FOCUS_COLORS[session.training_focus] ?? '#78909C';
                    const isLast = index === list.length - 1;
                    return (
                      <View key={session.id} style={[styles.sessionRow, !isLast && styles.sessionRowDivider]}>
                        <View style={styles.sessionRowTop}>
                          <Text style={styles.sessionDay}>{formatDay(session.date)}</Text>
                          {session.duration_minutes && (
                            <Text style={styles.sessionDuration}>{session.duration_minutes} min</Text>
                          )}
                        </View>
                        <View style={[styles.focusPill, { backgroundColor: color + '20' }]}>
                          <View style={[styles.focusDotSm, { backgroundColor: color }]} />
                          <Text style={[styles.focusPillText, { color }]}>{FOCUS_LABELS[session.training_focus]}</Text>
                        </View>
                        <Text style={styles.sessionTouches}>
                          {session.touches_logged.toLocaleString()}{' '}
                          <Text style={styles.sessionTouchesUnit}>touches</Text>
                        </Text>
                      </View>
                    );
                  })}
                  {!isPremium && recentSessions.length > 5 && (
                    <TouchableOpacity style={styles.seeMoreBtn} onPress={() => router.push('/(modals)/paywall')}>
                      <Text style={styles.seeMoreText}>See all sessions · Pro 🔒</Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
          </View>
        ) : null}

        {/* Touches Over Time */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Touches Over Time</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 80}
            height={200}
            chartConfig={{
              backgroundColor: '#FFF',
              backgroundGradientFrom: '#FFF',
              backgroundGradientTo: '#FFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(31, 137, 238, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(120, 144, 156, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: '5', strokeWidth: '2', stroke: '#1f89ee' },
              propsForBackgroundLines: { strokeDasharray: '', stroke: '#F5F7FA' },
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
    backgroundColor: '#FAFBFC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // FILTER
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F4F8',
    borderRadius: 10,
    padding: 3,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#1f89ee',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },

  // SHARED CARD
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 18,
  },

  // TRAINING BREAKDOWN
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
    width: 104,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F4F8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  breakdownPct: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1a1a2e',
    width: 36,
    textAlign: 'right',
  },

  // TOUCHES BY FOCUS
  touchesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  touchesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  focusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  touchesLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  touchesValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1f89ee',
  },

  // RECENT TRAINING
  sessionRow: {
    paddingVertical: 16,
    gap: 8,
  },
  sessionRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  sessionRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDay: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionDuration: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B0BEC5',
  },
  focusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  focusDotSm: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  focusPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sessionTouches: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a1a2e',
    lineHeight: 32,
  },
  sessionTouchesUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
  },
  seeMoreBtn: {
    paddingTop: 16,
    alignItems: 'center',
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f89ee',
  },

  // CHART
  chart: {
    marginTop: 4,
    borderRadius: 16,
  },

});
