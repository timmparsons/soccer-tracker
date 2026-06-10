import PageHeader from '@/components/common/PageHeader';
import { useDrillLeaderboard, type DrillLeaderboardEntry } from '@/hooks/useDrillLeaderboard';
import { useFeedEvents, FeedEvent } from '@/hooks/useFeedEvents';
import { useProfile } from '@/hooks/useProfile';
import { useTeam } from '@/hooks/useTeam';
import { useUser } from '@/hooks/useUser';
import { useWeeklyChallenge, getWeeklyChallengeDaysRemaining } from '@/hooks/useWeeklyChallenge';
import { usePlayerChallenges } from '@/hooks/usePlayerChallenges';
import { useTouchTracking } from '@/hooks/useTouchTracking';
import { formatTime } from '@/utils/formatTime';
import { getDisplayName } from '@/utils/getDisplayName';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import FeedEventDetailModal from '@/components/HomePage/FeedEventDetailModal';

// FEED CARDS

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function Avatar({ uri, size = 36 }: { uri: string | null; size?: number }) {
  return (
    <Image
      source={{ uri: uri || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#E5E7EB' }}
    />
  );
}

const EVENT_COLOR: Record<string, string> = {
  personal_best:              '#31af4d',
  challenge_won:              '#1f89ee',
  challenge_lost:             '#78909C',
  challenge_sent:             '#ffb724',
  badge_earned:               '#7c3aed',
  weekly_challenge_completed: '#1f89ee',
  leaderboard_top:            '#ff6b35',
  training_session:           '#78909C',
  group_challenge_sent:       '#ff6b35',
  group_challenge_completed:  '#31af4d',
};

function buildFeedCopy(
  event: FeedEvent,
  isMe: boolean,
): { headline: string; stat?: string } | null {
  const p = event.payload;
  const name = isMe ? 'You' : event.actor_name;

  switch (event.event_type) {
    case 'personal_best': {
      const drill = p.drill_name as string;
      const time = formatTime(p.time_seconds as number);
      const prev = p.previous_best != null ? formatTime(p.previous_best as number) : null;
      return prev
        ? { headline: `${name} improved ${drill}`, stat: `${prev} → ${time}` }
        : { headline: `${name} set a time on ${drill}`, stat: `${time} · ${p.touches_target} touches` };
    }
    case 'leaderboard_top':
      return {
        headline: `${name} took #1 on ${p.drill_name as string}`,
        stat: p.time_seconds ? formatTime(p.time_seconds as number) : undefined,
      };
    case 'challenge_won':
      return {
        headline: `${name} defeated ${p.opponent_name as string}`,
        stat: p.my_time && p.opponent_time
          ? `${formatTime(p.my_time as number)} vs ${formatTime(p.opponent_time as number)} · ${p.drill_name}`
          : (p.drill_name as string | undefined),
      };
    case 'challenge_lost':
      return {
        headline: `${name} lost to ${p.opponent_name as string}`,
        stat: p.my_time && p.opponent_time
          ? `${formatTime(p.my_time as number)} vs ${formatTime(p.opponent_time as number)} · ${p.drill_name}`
          : (p.drill_name as string | undefined),
      };
    case 'challenge_sent':
      return {
        headline: `${name} challenged ${p.opponent_name as string}`,
        stat: p.drill_name ? `${p.touches_target} ${p.drill_name}` : undefined,
      };
    case 'challenge_accepted':
      return null; // noise — skip entirely
    case 'badge_earned':
      return { headline: `${name} earned ${p.badge_name as string}` };
    case 'weekly_challenge_completed':
      return {
        headline: `${name} completed the weekly challenge`,
        stat: p.rank ? `Ranked #${p.rank}` : undefined,
      };
    case 'training_session':
      return p.touches_count
        ? { headline: `${name} — Game Speed Dribble`, stat: `${p.touches_count} touches · ${p.duration_minutes} min` }
        : null; // regular training sessions without notable context are noise
    case 'group_challenge_sent': {
      const names = Array.isArray(p.participant_names) ? (p.participant_names as string[]) : [];
      const others = names.filter((n) => !isMe || n !== event.actor_name);
      const nameStr = others.length > 2
        ? `${others[0]} + ${others.length - 1} others`
        : others.join(' & ');
      return {
        headline: `${name} started a group challenge with ${nameStr}`,
        stat: `${p.touches_target} touches`,
      };
    }
    case 'group_challenge_completed': {
      const rankN = p.rank as number;
      const suffix = rankN === 1 ? 'st' : rankN === 2 ? 'nd' : rankN === 3 ? 'rd' : 'th';
      return {
        headline: `${name} finished ${rankN}${suffix} in a group challenge`,
        stat: p.time_seconds ? formatTime(p.time_seconds as number) : undefined,
      };
    }
    default:
      return null;
  }
}

function FeedCard({ event, currentUserId, onPress }: { event: FeedEvent; currentUserId: string; onPress: () => void }) {
  const isMe = event.actor_id === currentUserId;
  const color = EVENT_COLOR[event.event_type] ?? '#78909C';
  const copy = buildFeedCopy(event, isMe);

  if (!copy) return null;

  return (
    <Pressable style={styles.feedCard} onPress={onPress}>
      <View style={[styles.feedAccent, { backgroundColor: color }]} />
      <View style={styles.feedCardInner}>
        <View style={styles.feedCardHeader}>
          <Avatar uri={event.actor_avatar} size={36} />
          <Text style={styles.feedTime}>{timeAgo(event.created_at)}</Text>
        </View>
        <Text style={styles.feedHeadline}>{copy.headline}</Text>
        {copy.stat ? <Text style={[styles.feedStat, { color }]}>{copy.stat}</Text> : null}
      </View>
    </Pressable>
  );
}

// CHALLENGE NUDGE CARD

const DAILY_GOAL_MINUTES = 15;

function ChallengeNudgeCard({
  challengerName,
  moreCount,
  todayMinutes,
}: {
  challengerName: string;
  moreCount: number;
  todayMinutes: number;
}) {
  const goalMet = todayMinutes >= DAILY_GOAL_MINUTES;
  const goalPct = Math.min(todayMinutes / DAILY_GOAL_MINUTES, 1);
  const minsLeft = Math.max(DAILY_GOAL_MINUTES - todayMinutes, 0);
  const label = moreCount > 0
    ? `${challengerName} + ${moreCount} other${moreCount > 1 ? 's' : ''} challenged you`
    : `${challengerName} challenged you`;

  return (
    <Pressable style={styles.nudgeCard} onPress={() => router.push('/(tabs)/challenges')}>
      <View style={styles.nudgeTop}>
        <Text style={styles.nudgeTitle}>{label}</Text>
        <Text style={styles.nudgeChevron}>›</Text>
      </View>

      {!goalMet && (
        <>
          <View style={styles.nudgeProgressRow}>
            <Text style={styles.nudgeProgressLabel}>Today's training</Text>
            <Text style={styles.nudgeProgressValue}>{todayMinutes} / {DAILY_GOAL_MINUTES} min</Text>
          </View>
          <View style={styles.nudgeTrack}>
            <View style={[styles.nudgeFill, { width: `${goalPct * 100}%` as any }]} />
          </View>
          <Text style={styles.nudgeHint}>
            Need a warmup? {minsLeft} minute{minsLeft !== 1 ? 's' : ''} left in today&apos;s goal. Players who hit it win more challenges.
          </Text>
        </>
      )}

      <View style={styles.nudgeActions}>
        <Pressable
          style={styles.nudgeTrainBtn}
          onPress={(e) => { e.stopPropagation(); router.push('/(tabs)/train'); }}
        >
          <Text style={styles.nudgeTrainBtnText}>Train Now</Text>
        </Pressable>
        <Pressable
          style={styles.nudgeViewBtn}
          onPress={() => router.push('/(tabs)/challenges')}
        >
          <Text style={styles.nudgeViewBtnText}>{goalMet ? 'Accept Challenge' : 'View Challenge'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// WEEKLY CHALLENGE CARD

function WeeklyChallengeCard({
  challenge,
  leaderboard,
  currentUserId,
}: {
  challenge: NonNullable<ReturnType<typeof useWeeklyChallenge>['data']>;
  leaderboard: DrillLeaderboardEntry[];
  currentUserId: string;
}) {
  const daysLeft = getWeeklyChallengeDaysRemaining(challenge.end_date);
  const displayEntries = leaderboard.slice(0, 5);

  return (
    <Pressable style={styles.weeklyCard} onPress={() => router.push({ pathname: '/(tabs)/train', params: { drillId: challenge.drill_id } })}>
      <View style={styles.weeklyHeader}>
        <Text style={styles.weeklyLabel}>WEEKLY CHALLENGE</Text>
        <Text style={styles.weeklyDays}>
          {daysLeft === 0 ? 'Last day' : `${daysLeft}d left`}
        </Text>
      </View>
      <Text style={styles.weeklyDrill}>
        {challenge.touches_target} {challenge.drill_name}
      </Text>
      {displayEntries.length > 0 ? (
        <View style={styles.weeklyLeaderboard}>
          {displayEntries.map((entry) => {
            const isMe = entry.user_id === currentUserId;
            return (
              <View key={entry.user_id} style={[styles.weeklyRow, isMe && styles.weeklyRowMe]}>
                <Text style={[styles.weeklyRowRank, isMe && styles.weeklyRowValueMe]}>
                  {entry.rank}.
                </Text>
                <Text style={[styles.weeklyRowName, isMe && styles.weeklyRowValueMe]} numberOfLines={1}>
                  {isMe ? 'You' : entry.name}
                </Text>
                <Text style={[styles.weeklyRowTime, isMe && styles.weeklyRowValueMe]}>
                  {formatTime(entry.best_time)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.weeklyEmpty}>No times yet — be first!</Text>
      )}
      <View style={styles.weeklyButton}>
        <Text style={styles.weeklyButtonText}>TRAIN NOW</Text>
      </View>
    </Pressable>
  );
}

// MAIN SCREEN

const HomeScreen = () => {
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);
  const { data: team } = useTeam(user?.id);
  const { data: feedEvents = [], isLoading, refetch: refetchFeed } = useFeedEvents(profile?.team_id ?? undefined);
  const { data: weeklyChallenge } = useWeeklyChallenge(profile?.team_id ?? undefined);
  const { data: challenges = [] } = usePlayerChallenges(user?.id);
  const { data: touchStats } = useTouchTracking(user?.id);
  const { data: leaderboard = [] } = useDrillLeaderboard(
    weeklyChallenge?.drill_id,
    weeklyChallenge?.touches_target ?? 100,
    profile?.team_id ?? undefined,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<FeedEvent | null>(null);
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchProfile(),
      refetchFeed(),
      queryClient.invalidateQueries({ queryKey: ['weekly-challenge'] }),
      queryClient.invalidateQueries({ queryKey: ['drill-leaderboard'] }),
    ]);
    setRefreshing(false);
  }, [refetchProfile, refetchFeed, queryClient]);

  const displayName = getDisplayName(profile);
  const teamName = team?.name;
  const firstName = displayName.split(' ')[0];

  const pendingIncoming = challenges.filter(
    (c) => c.status === 'pending' && c.challenged_id === user?.id,
  );
  const todayMinutes = touchStats?.today_minutes ?? 0;

  const listHeader = (
    <>
      {weeklyChallenge && (
        <WeeklyChallengeCard
          challenge={weeklyChallenge}
          leaderboard={leaderboard}
          currentUserId={user?.id ?? ''}
        />
      )}
      {pendingIncoming.length > 0 && (
        <ChallengeNudgeCard
          challengerName={pendingIncoming[0].challenger_name ?? 'Someone'}
          moreCount={pendingIncoming.length - 1}
          todayMinutes={todayMinutes}
        />
      )}
      {feedEvents.length > 0 && (
        <Text style={styles.feedSectionLabel}>Activity</Text>
      )}
    </>
  );

  const emptyState = (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>⚽</Text>
      <Text style={styles.emptyTitle}>No activity yet</Text>
      <Text style={styles.emptyText}>
        Be the first to train today — your activity will appear here for teammates.
      </Text>
      <Pressable style={styles.emptyButton} onPress={() => router.push('/(tabs)/train')}>
        <Text style={styles.emptyButtonText}>Start Training</Text>
      </Pressable>
    </View>
  );

  if (isLoading && !feedEvents.length) {
    return (
      <View style={styles.container}>
        <PageHeader
          title={`Hey ${firstName}!`}
          subtitle={teamName ?? 'Ready to get some touches?'}
          showAvatar
          avatarUrl={profile?.avatar_url}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f89ee" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title={`Hey ${firstName}!`}
        subtitle={teamName ?? 'Ready to get some touches?'}
        showAvatar
        avatarUrl={profile?.avatar_url}
      />
      <FlatList
        data={feedEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedCard event={item} currentUserId={user?.id ?? ''} onPress={() => setSelectedEvent(item)} />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1f89ee" />
        }
      />
      <FeedEventDetailModal
        event={selectedEvent}
        teamId={profile?.team_id ?? undefined}
        onClose={() => setSelectedEvent(null)}
      />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },

  // WEEKLY CHALLENGE
  weeklyCard: {
    backgroundColor: '#1f89ee',
    borderRadius: 20,
    padding: 18,
    marginBottom: 6,
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weeklyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  weeklyDays: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffb724',
  },
  weeklyDrill: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  weeklyLeaderboard: {
    gap: 6,
    marginBottom: 14,
  },
  weeklyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  weeklyRowMe: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  weeklyRowRank: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    width: 20,
  },
  weeklyRowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  weeklyRowTime: {
    fontSize: 14,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.7)',
  },
  weeklyRowValueMe: {
    color: '#FFFFFF',
  },
  weeklyEmpty: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 14,
  },
  weeklyButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  weeklyButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1f89ee',
    letterSpacing: 0.5,
  },

  // CHALLENGE NUDGE
  nudgeCard: {
    backgroundColor: '#FFF8EC',
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#FFE4A0',
    shadowColor: '#ffb724',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  nudgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nudgeTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#92400E',
    flex: 1,
  },
  nudgeChevron: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D97706',
  },
  nudgeProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nudgeProgressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  nudgeProgressValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  nudgeTrack: {
    height: 6,
    backgroundColor: '#FDE68A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  nudgeFill: {
    height: 6,
    backgroundColor: '#ffb724',
    borderRadius: 3,
  },
  nudgeHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
    lineHeight: 17,
  },
  nudgeActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  nudgeTrainBtn: {
    flex: 1,
    backgroundColor: '#ffb724',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  nudgeTrainBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  nudgeViewBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#D97706',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  nudgeViewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },

  // FEED
  feedSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
    marginBottom: 4,
    marginTop: 4,
  },
  feedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  feedAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  feedCardInner: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedTime: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#B0BEC5',
    textAlign: 'right',
  },
  feedHeadline: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    lineHeight: 21,
  },
  feedStat: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  // EMPTY STATE
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 8,
    backgroundColor: '#1f89ee',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
