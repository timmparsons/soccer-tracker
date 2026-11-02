import ActivityFeed from '@/components/HomePage/ActivityFeed';
import QuickLaunchButton from '@/components/HomePage/QuickLaunchButton';
import StreakBanner from '@/components/HomePage/StreakBanner';
import WeeklyGoalCard from '@/components/HomePage/WeeklyGoalCard';
import CircularProgress from '@/components/common/CircularProgress';
import PageHeader from '@/components/common/PageHeader';
import VinnieCard from '@/components/common/VinnieCard';
import StreakModal from '@/components/modals/StreakModal';
import { HERO_BG, PAGE_BG } from '@/constants/colors';
import { useChallengeNotifications } from '@/hooks/useChallengeNotifications';
import { useProfile } from '@/hooks/useProfile';
import {
  pickDailyCircuit,
  pickDailySkillChallenge,
  useTodayChallengeCompletions,
  useWorkoutLibrary,
} from '@/hooks/useWorkouts';
import {
  useActiveStreak,
  useChallengeStats,
  useTouchTracking,
} from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { getCrossedConfettiMilestone } from '@/lib/streakMilestones';
import { pickForDate } from '@/utils/dailySeed';
import { getDisplayName } from '@/utils/getDisplayName';
import { getLocalDate } from '@/utils/getLocalDate';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const HomeScreen = () => {
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);
  const challengeNotifications = useChallengeNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [teamNudgeDismissed, setTeamNudgeDismissed] = useState(false);
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const queryClient = useQueryClient();
  const confettiRef = useRef<ConfettiCannon>(null);

  const {
    data: touchStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useTouchTracking(user?.id);

  const { data: challengeStats, refetch: refetchChallengeStats } =
    useChallengeStats(user?.id, undefined);

  const { data: activeStreakStats, refetch: refetchActiveStreak } =
    useActiveStreak(user?.id);

  const { workouts: circuitWorkouts, isLoading: workoutsLoading } = useWorkoutLibrary();
  const fiveMinCircuit = pickDailyCircuit(circuitWorkouts, 300);
  const skillChallenge = pickDailySkillChallenge(circuitWorkouts);

  // Same day-seeded rotation as pickDailyCircuit/pickDailySkillChallenge, so
  // the pick stays stable all day. Tabata has no data dependency, so it's
  // always in the pool — circuit/skill only join if today's pick exists.
  const today = new Date();
  const challengeVariants = [
    ...(fiveMinCircuit ? (['circuit'] as const) : []),
    'tabata' as const,
    ...(skillChallenge ? (['skill'] as const) : []),
  ];
  const challengeVariant = pickForDate(challengeVariants, today, 'variant')!;
  const challengeTitle =
    challengeVariant === 'circuit'
      ? fiveMinCircuit!.title
      : challengeVariant === 'skill'
        ? skillChallenge!.title
        : '4-Min Burst';
  const { data: challengeCompletions } = useTodayChallengeCompletions(user?.id);
  const challengeWorkoutId =
    challengeVariant === 'circuit' ? fiveMinCircuit!.id : challengeVariant === 'skill' ? skillChallenge!.id : null;
  const challengeCompleted = (challengeCompletions ?? []).some((c) =>
    challengeWorkoutId ? c.workoutId === challengeWorkoutId : c.challengeType === 'tabata',
  );


  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchProfile(),
      refetchStats(),
      refetchChallengeStats(),
      refetchActiveStreak(),
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['activity-reactions-unviewed', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['weekly-goal', user?.id] }),
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

  // Confetti the moment a streak milestone day (10/25/50/100/150/200...) is
  // completed — not on every later app open at that same streak count.
  useEffect(() => {
    const currentStreak = activeStreakStats?.currentStreak;
    if (!user?.id || currentStreak == null) return;

    let cancelled = false;
    (async () => {
      const key = `streak:lastSeenCount:${user.id}`;
      const stored = await AsyncStorage.getItem(key);
      if (cancelled) return;

      if (stored !== null) {
        const lastSeen = parseInt(stored, 10);
        const milestone = getCrossedConfettiMilestone(lastSeen, currentStreak);
        if (milestone !== null) {
          setTimeout(() => confettiRef.current?.start(), 300);
        }
      }

      await AsyncStorage.setItem(key, String(currentStreak));
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, activeStreakStats?.currentStreak]);

  if (statsLoading || workoutsLoading) {
    return <View style={styles.loadingContainer} />;
  }

  const displayName = getDisplayName(profile);
  // "Hey Beau" / "Goatsons!" — single-word names become "Hey" / "Beau!"
  const [firstName, ...restOfName] = displayName.split(' ');
  const greeting = restOfName.length > 0 ? `Hey ${firstName}` : 'Hey';
  const greetingAccent = `${restOfName.length > 0 ? restOfName.join(' ') : firstName}!`;
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
        title={greeting}
        titleAccent={greetingAccent}
        subtitle='Ready to get some touches?'
        showAvatar={true}
        avatarUrl={profile?.avatar_url}
        challengeNotifications={challengeNotifications}
        dark
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor='#FFFFFF'
          />
        }
      >
        {/* HERO BACKDROP — dark behind the streak banner, fading into the page */}
        <View style={styles.heroOverscroll} />
        <LinearGradient
          colors={[HERO_BG, '#6FB5F5', PAGE_BG]}
          locations={[0, 0.6, 1]}
          style={styles.heroGradient}
          pointerEvents='none'
        />

        {/* STREAK BANNER */}
        {!profile?.is_coach && (
          <StreakBanner
            streak={streak}
            todayTouches={todayTouches}
            onPress={() => setStreakModalVisible(true)}
          />
        )}

        {/* WEEKLY GOAL */}
        {!profile?.is_coach && user?.id && (
          <WeeklyGoalCard userId={user.id} weekActivity={activeStreakStats?.weekActivity || []} />
        )}

        {/* CHALLENGE OF THE DAY */}
        {!profile?.is_coach && user?.id && (
          <View style={styles.quickLaunchRow}>
            <QuickLaunchButton
              icon={challengeVariant === 'circuit' ? 'barbell' : challengeVariant === 'skill' ? 'football' : 'flash'}
              iconColor={challengeVariant === 'circuit' ? '#1f89ee' : challengeVariant === 'skill' ? '#31af4d' : '#ffb724'}
              subtitle='Challenge of the Day'
              label={challengeTitle}
              completed={challengeCompleted}
              onPress={() => {
                if (challengeVariant === 'circuit') {
                  router.push({ pathname: '/(modals)/circuit', params: { id: fiveMinCircuit!.id } });
                } else if (challengeVariant === 'skill') {
                  router.push({ pathname: '/(modals)/skill-challenge', params: { id: skillChallenge!.id } });
                } else {
                  router.push('/(modals)/tabata');
                }
              }}
            />
          </View>
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

        {/* VINNIE — coaches only; players get the streak + weekly goal cards instead */}
        {profile?.is_coach && (
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
        )}

        {/* TODAY'S PROGRESS */}
        <View style={styles.todayCardShadow}>
          <LinearGradient
            colors={['#2A94F4', '#1877E0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.todayCardFull}
          >
            <View style={styles.todayStripes} pointerEvents='none'>
              <View style={styles.todayStripe} />
              <View style={[styles.todayStripe, styles.todayStripeOffset]} />
            </View>
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
                  size={112}
                  thickness={9}
                  color={todayDone ? '#ffb724' : '#FFFFFF'}
                  trackColor='rgba(255,255,255,0.3)'
                  labelColor='rgba(255,255,255,0.9)'
                  showStreak={!!profile?.is_coach}
                  streak={streak}
                />
              </TouchableOpacity>
              <View style={styles.todayDivider} />
              <View style={styles.todayRingMeta}>
                <View style={styles.todayCountRow}>
                  <Text style={styles.todayTouches}>{todayTouches.toLocaleString()}</Text>
                  <Text style={styles.todayTarget}> / {dailyTarget.toLocaleString()} touches</Text>
                </View>
                <View style={styles.todayBarTrack}>
                  <View style={[styles.todayBarFill, { width: `${todayPct}%` }, todayDone && styles.todayBarFillDone]} />
                </View>
                <Text style={styles.todaySubtext}>
                  {todayDone ? 'Smashed it — keep going!' : `${(dailyTarget - todayTouches).toLocaleString()} to go`}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

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

      <ConfettiCannon
        ref={confettiRef}
        count={180}
        origin={{ x: Dimensions.get('window').width / 2, y: -20 }}
        autoStart={false}
        fadeOut
        colors={['#ffb724', '#1f89ee', '#31af4d', '#FF6B6B', '#A855F7']}
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
    backgroundColor: PAGE_BG,
  },
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },

  // HERO
  heroOverscroll: {
    position: 'absolute',
    top: -1000,
    left: 0,
    right: 0,
    height: 1000,
    backgroundColor: HERO_BG,
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 230,
  },
  // QUICK LAUNCH BAR
  quickLaunchRow: {
    gap: 10,
  },

  // TODAY'S PROGRESS — full width
  todayCardFull: {
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
  },
  todayCardShadow: {
    borderRadius: 24,
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  todayStripes: {
    position: 'absolute',
    top: -40,
    right: -20,
    flexDirection: 'row',
    gap: 18,
    transform: [{ rotate: '35deg' }],
  },
  todayStripe: {
    width: 26,
    height: 180,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  todayStripeOffset: {
    marginTop: 30,
  },
  todayDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  todayBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
    marginVertical: 8,
  },
  todayBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  todayBarFillDone: {
    backgroundColor: '#ffb724',
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
    gap: 16,
  },
  todayRingMeta: {
    flex: 1,
  },

  todaySectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
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
    flexWrap: 'wrap',
  },
  todayTouches: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  todayTarget: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  todaySubtext: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
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
