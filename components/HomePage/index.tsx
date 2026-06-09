import PageHeader from '@/components/common/PageHeader';
import { useDrillLeaderboard, type DrillLeaderboardEntry } from '@/hooks/useDrillLeaderboard';
import { useFeedEvents, FeedEvent } from '@/hooks/useFeedEvents';
import { useProfile } from '@/hooks/useProfile';
import { useTeam } from '@/hooks/useTeam';
import { useUser } from '@/hooks/useUser';
import { useWeeklyChallenge, getWeeklyChallengeDaysRemaining } from '@/hooks/useWeeklyChallenge';
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

  const listHeader = (
    <>
      {weeklyChallenge && (
        <WeeklyChallengeCard
          challenge={weeklyChallenge}
          leaderboard={leaderboard}
          currentUserId={user?.id ?? ''}
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
