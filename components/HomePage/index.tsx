import PageHeader from '@/components/common/PageHeader';
import { useDrillLeaderboard } from '@/hooks/useDrillLeaderboard';
import { useFeedEvents, FeedEvent } from '@/hooks/useFeedEvents';
import { useProfile } from '@/hooks/useProfile';
import { useTeam } from '@/hooks/useTeam';
import { useTouchTracking, useChallengeStats } from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { useWeeklyChallenge, getWeeklyChallengeDaysRemaining } from '@/hooks/useWeeklyChallenge';
import { useDrillPersonalBests } from '@/hooks/useDrillAttempts';
import { useChallengeOfTheDay, type ChallengeOfTheDay } from '@/hooks/useChallengeOfTheDay';
import { formatTime } from '@/utils/formatTime';
import { getDisplayName } from '@/utils/getDisplayName';
import { LinearGradient } from 'expo-linear-gradient';
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

const EVENT_META: Record<string, { label: string; color: string }> = {
  personal_best:              { label: 'Personal Best',        color: '#31af4d' },
  challenge_won:              { label: 'Challenge Won',         color: '#1f89ee' },
  challenge_lost:             { label: 'Challenge',             color: '#78909C' },
  challenge_sent:             { label: 'Challenge Sent',        color: '#ffb724' },
  challenge_accepted:         { label: 'Challenge Accepted',    color: '#ffb724' },
  badge_earned:               { label: 'Badge Earned',          color: '#7c3aed' },
  weekly_challenge_completed: { label: 'Weekly Challenge',      color: '#1f89ee' },
  leaderboard_top:            { label: '#1 on Team',            color: '#ff6b35' },
  training_session:           { label: 'Trained',               color: '#78909C' },
  group_challenge_sent:       { label: 'Group Challenge',       color: '#ff6b35' },
  group_challenge_completed:  { label: 'Group Challenge',       color: '#31af4d' },
};

function formatParticipantNames(names: string[]): string {
  if (names.length <= 2) return names.join(' & ');
  return `${names[0]}, ${names[1]} +${names.length - 2} more`;
}

function FeedCard({ event, currentUserId, onPress }: { event: FeedEvent; currentUserId: string; onPress: () => void }) {
  const isMe = event.actor_id === currentUserId;
  const name = isMe ? 'You' : event.actor_name;
  const p = event.payload;
  const meta = EVENT_META[event.event_type] ?? { label: event.event_type, color: '#78909C' };

  let detail = '';
  let stat = '';

  switch (event.event_type) {
    case 'personal_best':
      detail = p.drill_name ? `${p.drill_name} · ${p.touches_target ?? ''} touches` : '';
      stat = p.time_seconds ? formatTime(p.time_seconds as number) : '';
      break;
    case 'challenge_won':
    case 'challenge_lost':
      detail = p.drill_name ? `${p.drill_name} · ${p.touches_target ?? ''} touches` : '';
      stat = p.my_time && p.opponent_time
        ? `${formatTime(p.my_time as number)} vs ${formatTime(p.opponent_time as number)}`
        : '';
      break;
    case 'challenge_sent':
    case 'challenge_accepted':
      detail = p.opponent_name
        ? `vs ${p.opponent_name as string}`
        : '';
      stat = p.drill_name ? `${p.drill_name} · ${p.touches_target} touches` : '';
      break;
    case 'badge_earned':
      detail = (p.badge_name as string) || '';
      break;
    case 'weekly_challenge_completed':
      detail = p.drill_name ? `${p.drill_name}` : '';
      stat = p.rank ? `Rank #${p.rank}` : '';
      break;
    case 'leaderboard_top':
      detail = p.drill_name ? `${p.drill_name} · ${p.touches_target} touches` : '';
      stat = p.time_seconds ? formatTime(p.time_seconds as number) : '';
      break;
    case 'training_session':
      detail = p.drill_name ? (p.drill_name as string) : '';
      stat = p.time_seconds ? formatTime(p.time_seconds as number) : '';
      break;
    case 'group_challenge_sent': {
      const names = Array.isArray(p.participant_names) ? (p.participant_names as string[]) : [];
      detail = names.length > 0 ? formatParticipantNames(names) : '';
      stat = `${p.touches_target} touches`;
      break;
    }
    case 'group_challenge_completed': {
      const names = Array.isArray(p.participant_names) ? (p.participant_names as string[]) : [];
      detail = names.length > 0 ? formatParticipantNames(names) : '';
      const rankSuffix = ['', 'st', 'nd', 'rd'][(p.rank as number) <= 3 ? (p.rank as number) : 0] ?? 'th';
      stat = p.time_seconds
        ? `${formatTime(p.time_seconds as number)} · ${p.rank}${rankSuffix} of ${p.total_participants}`
        : '';
      break;
    }
  }

  return (
    <Pressable style={styles.feedCard} onPress={onPress}>
      {/* Left accent bar */}
      <View style={[styles.feedAccent, { backgroundColor: meta.color }]} />

      <View style={styles.feedCardInner}>
        {/* Top row: avatar + name + time */}
        <View style={styles.feedCardHeader}>
          <Avatar uri={event.actor_avatar} size={40} />
          <View style={styles.feedCardHeaderText}>
            <Text style={styles.feedName}>{name}</Text>
            <Text style={styles.feedTime}>{timeAgo(event.created_at)}</Text>
          </View>
        </View>

        {/* Event type badge */}
        <View style={[styles.feedBadge, { backgroundColor: `${meta.color}18` }]}>
          <Text style={[styles.feedBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>

        {/* Detail + stat */}
        {detail ? <Text style={styles.feedDetail}>{detail}</Text> : null}
        {stat ? <Text style={[styles.feedStat, { color: meta.color }]}>{stat}</Text> : null}
      </View>
    </Pressable>
  );
}

// WEEKLY CHALLENGE CARD

function WeeklyChallengeCard({
  challenge,
  myBestTime,
  leaderTime,
  myRank,
}: {
  challenge: NonNullable<ReturnType<typeof useWeeklyChallenge>['data']>;
  myBestTime: number | null;
  leaderTime: number | null;
  myRank: number | null;
}) {
  const daysLeft = getWeeklyChallengeDaysRemaining(challenge.end_date);

  return (
    <Pressable style={styles.weeklyCard} onPress={() => router.push('/(tabs)/train')}>
      <View style={styles.weeklyHeader}>
        <Text style={styles.weeklyLabel}>WEEKLY CHALLENGE</Text>
        <Text style={styles.weeklyDays}>
          {daysLeft === 0 ? 'Last day' : `${daysLeft}d left`}
        </Text>
      </View>
      <Text style={styles.weeklyDrill}>
        {challenge.touches_target} {challenge.drill_name}
      </Text>
      <View style={styles.weeklyStats}>
        {myRank != null && (
          <View style={styles.weeklyStat}>
            <Text style={styles.weeklyStatValue}>#{myRank}</Text>
            <Text style={styles.weeklyStatLabel}>Your Rank</Text>
          </View>
        )}
        {myBestTime != null && (
          <View style={styles.weeklyStat}>
            <Text style={styles.weeklyStatValue}>{formatTime(myBestTime)}</Text>
            <Text style={styles.weeklyStatLabel}>Your Best</Text>
          </View>
        )}
        {leaderTime != null && (
          <View style={styles.weeklyStat}>
            <Text style={[styles.weeklyStatValue, { color: '#ffb724' }]}>{formatTime(leaderTime)}</Text>
            <Text style={styles.weeklyStatLabel}>Leader</Text>
          </View>
        )}
      </View>
      <View style={styles.weeklyButton}>
        <Text style={styles.weeklyButtonText}>TRAIN NOW</Text>
      </View>
    </Pressable>
  );
}

// CHALLENGE OF THE DAY CARD

function ChallengeOfTheDayCard({
  cotd,
  currentUserId,
}: {
  cotd: ChallengeOfTheDay;
  currentUserId: string;
}) {
  const top3 = cotd.entries.slice(0, 3);
  const completed = cotd.entries.length;
  const iDone = cotd.entries.some((e) => e.user_id === currentUserId);

  return (
    <Pressable
      style={styles.cotdCard}
      onPress={() => router.push({ pathname: '/(tabs)/train', params: { drillId: cotd.drill_id } })}
    >
      <View style={styles.cotdHeader}>
        <Text style={styles.cotdLabel}>CHALLENGE OF THE DAY</Text>
        {iDone && (
          <View style={styles.cotdDonePill}>
            <Text style={styles.cotdDoneText}>Done ✓</Text>
          </View>
        )}
      </View>
      <Text style={styles.cotdDrill}>
        {cotd.touches_target} {cotd.drill_name}
      </Text>

      {top3.length > 0 ? (
        <View style={styles.cotdBoard}>
          {top3.map((e, i) => {
            const isMe = e.user_id === currentUserId;
            const medals = ['🥇', '🥈', '🥉'];
            return (
              <View key={e.user_id} style={styles.cotdRow}>
                <Text style={styles.cotdMedal}>{medals[i]}</Text>
                <Image
                  source={{ uri: e.avatar_url ?? 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                  style={styles.cotdAvatar}
                />
                <Text style={[styles.cotdName, isMe && styles.cotdNameMe]} numberOfLines={1}>
                  {isMe ? 'You' : e.name}
                </Text>
                <Text style={styles.cotdTime}>{formatTime(e.time_seconds)}</Text>
              </View>
            );
          })}
          {completed > 3 && (
            <Text style={styles.cotdMore}>+{completed - 3} more completed</Text>
          )}
        </View>
      ) : (
        <Text style={styles.cotdEmpty}>No one has done it yet — be first!</Text>
      )}

      <View style={styles.cotdButton}>
        <Text style={styles.cotdButtonText}>{iDone ? 'BEAT YOUR TIME' : 'TRAIN NOW'}</Text>
      </View>
    </Pressable>
  );
}

// MAIN SCREEN

const HomeScreen = () => {
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);
  const { data: team } = useTeam(user?.id);
  const { data: stats } = useTouchTracking(user?.id);
  const { data: feedEvents = [], isLoading, refetch: refetchFeed } = useFeedEvents(profile?.team_id ?? undefined);
  const { data: weeklyChallenge } = useWeeklyChallenge(profile?.team_id ?? undefined);
  const { data: cotd } = useChallengeOfTheDay(profile?.team_id ?? undefined);
  const { data: challengeStats } = useChallengeStats(user?.id, cotd?.drill_id ?? null);
  const { data: personalBests = [] } = useDrillPersonalBests(user?.id);
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
      queryClient.invalidateQueries({ queryKey: ['touch-tracking', user?.id] }),
    ]);
    setRefreshing(false);
  }, [refetchProfile, refetchFeed, queryClient, user?.id]);

  const myPB = weeklyChallenge
    ? personalBests.find(
        (pb) =>
          pb.drill_id === weeklyChallenge.drill_id &&
          pb.touches_target === weeklyChallenge.touches_target,
      )
    : null;

  const myRank = weeklyChallenge && user?.id
    ? (leaderboard.find((e) => e.user_id === user.id)?.rank ?? null)
    : null;

  const leaderEntry = leaderboard[0];

  const displayName = getDisplayName(profile);
  const teamName = team?.name;
  const firstName = displayName.split(' ')[0];

  const todayPct = stats
    ? Math.min((stats.today_touches / stats.daily_target) * 100, 100)
    : 0;

  const listHeader = (
    <>
      <View style={styles.statsRow}>
        <LinearGradient colors={['#1f89ee', '#0d5fba']} style={styles.statCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.statIcon}>⚡</Text>
          <Text style={styles.statValue}>{stats?.today_touches ?? 0}</Text>
          <Text style={styles.statUnit}>touches</Text>
          <Text style={styles.statLabel}>TODAY</Text>
          <View style={styles.statBar}>
            <View style={[styles.statBarFill, { width: `${todayPct}%` as any }]} />
          </View>
        </LinearGradient>
        <LinearGradient colors={['#ff6b35', '#ffb724']} style={styles.statCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={styles.statValue}>{challengeStats?.challengeStreak ?? 0}</Text>
          <Text style={styles.statUnit}>days</Text>
          <Text style={styles.statLabel}>CHALLENGE STREAK</Text>
        </LinearGradient>
        <LinearGradient colors={['#7c3aed', '#1f89ee']} style={styles.statCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.statIcon}>⭐</Text>
          <Text style={styles.statValue}>{stats?.this_week_touches ?? 0}</Text>
          <Text style={styles.statUnit}>touches</Text>
          <Text style={styles.statLabel}>THIS WEEK</Text>
        </LinearGradient>
      </View>
      {cotd && (
        <ChallengeOfTheDayCard cotd={cotd} currentUserId={user?.id ?? ''} />
      )}
      {weeklyChallenge && (
        <WeeklyChallengeCard
          challenge={weeklyChallenge}
          myBestTime={myPB?.best_time ?? null}
          leaderTime={leaderEntry?.best_time ?? null}
          myRank={myRank}
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

  // CHALLENGE OF THE DAY
  cotdCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 18,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  cotdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cotdLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffb724',
    letterSpacing: 1,
  },
  cotdDonePill: {
    backgroundColor: 'rgba(49,175,77,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cotdDoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#31af4d',
  },
  cotdDrill: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  cotdBoard: {
    gap: 8,
    marginBottom: 14,
  },
  cotdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cotdMedal: {
    fontSize: 14,
    width: 20,
  },
  cotdAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2d2d4e',
  },
  cotdName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  cotdNameMe: {
    color: '#1f89ee',
  },
  cotdTime: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
  },
  cotdMore: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  cotdEmpty: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 14,
  },
  cotdButton: {
    backgroundColor: '#ffb724',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cotdButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: 0.5,
  },

  // STATS ROW
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    gap: 1,
  },
  statIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statBar: {
    marginTop: 10,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  statBarFill: {
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
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
  weeklyStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 14,
  },
  weeklyStat: {
    gap: 2,
  },
  weeklyStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  weeklyStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
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
  feedCardHeaderText: {
    flex: 1,
  },
  feedName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  feedTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B0BEC5',
    marginTop: 1,
  },
  feedBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  feedBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  feedDetail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#455A64',
  },
  feedStat: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
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
