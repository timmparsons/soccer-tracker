import { useDrillLeaderboard } from '@/hooks/useDrillLeaderboard';
import { type FeedEvent } from '@/hooks/useFeedEvents';
import { formatTime } from '@/utils/formatTime';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Mini leaderboard row
function LeaderRow({
  rank,
  name,
  time,
  isHighlighted,
}: {
  rank: number;
  name: string;
  time: number;
  isHighlighted: boolean;
}) {
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  return (
    <View style={[styles.leaderRow, isHighlighted && styles.leaderRowHighlight]}>
      <Text style={styles.leaderRank}>{medals[rank] ?? `#${rank}`}</Text>
      <Text style={[styles.leaderName, isHighlighted && styles.leaderNameHighlight]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.leaderTime, isHighlighted && styles.leaderTimeHighlight]}>
        {formatTime(time)}
      </Text>
    </View>
  );
}

// Leaderboard section — live query, only used for personal_best / training_session / leaderboard_top
function LiveLeaderboard({
  drillId,
  touchesTarget,
  teamId,
  actorId,
}: {
  drillId: string;
  touchesTarget: number;
  teamId: string;
  actorId: string;
}) {
  const { data: board = [], isLoading } = useDrillLeaderboard(drillId, touchesTarget, teamId);
  if (isLoading) return null;
  if (!board.length) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Team Leaderboard</Text>
      {board.map((e) => (
        <LeaderRow
          key={e.user_id}
          rank={e.rank}
          name={e.name}
          time={e.best_time}
          isHighlighted={e.user_id === actorId}
        />
      ))}
    </View>
  );
}

// Content per event type
function EventDetail({
  event,
  teamId,
}: {
  event: FeedEvent;
  teamId: string | undefined;
}) {
  const p = event.payload;

  switch (event.event_type) {
    case 'personal_best': {
      const improved = p.previous_best != null
        ? ((p.previous_best as number) - (p.time_seconds as number)).toFixed(1)
        : null;
      return (
        <>
          <View style={styles.heroStat}>
            <Text style={styles.heroTime}>{formatTime(p.time_seconds as number)}</Text>
            <Text style={styles.heroLabel}>{p.drill_name as string} · {p.touches_target as number} touches</Text>
            {improved != null && parseFloat(improved) > 0 && (
              <View style={styles.improvementPill}>
                <Text style={styles.improvementText}>{improved}s faster than previous best</Text>
              </View>
            )}
            {p.previous_best != null && (
              <Text style={styles.prevBest}>Previous best: {formatTime(p.previous_best as number)}</Text>
            )}
          </View>
          {teamId && p.drill_id && (
            <LiveLeaderboard
              drillId={p.drill_id as string}
              touchesTarget={p.touches_target as number}
              teamId={teamId}
              actorId={event.actor_id}
            />
          )}
        </>
      );
    }

    case 'training_session': {
      return (
        <>
          <View style={styles.heroStat}>
            <Text style={styles.heroTime}>{formatTime(p.time_seconds as number)}</Text>
            <Text style={styles.heroLabel}>{p.drill_name as string} · {p.touches_target as number} touches</Text>
          </View>
          {teamId && p.drill_id && (
            <LiveLeaderboard
              drillId={p.drill_id as string}
              touchesTarget={p.touches_target as number}
              teamId={teamId}
              actorId={event.actor_id}
            />
          )}
        </>
      );
    }

    case 'leaderboard_top': {
      return (
        <>
          <View style={styles.heroStat}>
            <Text style={styles.heroRank}>#1</Text>
            <Text style={styles.heroLabel}>{p.drill_name as string} · {p.touches_target as number} touches</Text>
            {p.time_seconds != null && (
              <Text style={styles.heroTimeSub}>{formatTime(p.time_seconds as number)}</Text>
            )}
          </View>
          {teamId && p.drill_id && (
            <LiveLeaderboard
              drillId={p.drill_id as string}
              touchesTarget={p.touches_target as number}
              teamId={teamId}
              actorId={event.actor_id}
            />
          )}
        </>
      );
    }

    case 'challenge_won':
    case 'challenge_lost': {
      const won = event.event_type === 'challenge_won';
      const myTime = p.my_time as number;
      const opponentTime = p.opponent_time as number;
      const diff = won
        ? (opponentTime - myTime).toFixed(1)
        : (myTime - opponentTime).toFixed(1);
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{p.drill_name as string} · {p.touches_target as number} touches</Text>
          <View style={styles.h2hRow}>
            <View style={[styles.h2hSide, won && styles.h2hSideWin]}>
              <Text style={styles.h2hName}>{event.actor_name}</Text>
              <Text style={[styles.h2hTime, won && styles.h2hTimeWin]}>{formatTime(myTime)}</Text>
              {won && <Text style={styles.h2hBadge}>Winner</Text>}
            </View>
            <Text style={styles.h2hVs}>vs</Text>
            <View style={[styles.h2hSide, !won && styles.h2hSideWin]}>
              <Text style={styles.h2hName}>{p.opponent_name as string}</Text>
              <Text style={[styles.h2hTime, !won && styles.h2hTimeWin]}>{formatTime(opponentTime)}</Text>
              {!won && <Text style={styles.h2hBadge}>Winner</Text>}
            </View>
          </View>
          <Text style={styles.marginText}>
            {won ? `Won by ${diff}s` : `Lost by ${diff}s`}
          </Text>
        </View>
      );
    }

    case 'challenge_sent':
    case 'challenge_accepted': {
      const sent = event.event_type === 'challenge_sent';
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {p.drill_name as string} · {p.touches_target as number} touches
          </Text>
          <Text style={styles.bodyText}>
            {sent
              ? `${event.actor_name} challenged ${p.opponent_name as string}`
              : `${event.actor_name} accepted ${p.opponent_name as string}'s challenge`}
          </Text>
        </View>
      );
    }

    case 'badge_earned': {
      return (
        <View style={styles.badgeCenter}>
          <Text style={styles.badgeIcon}>🏅</Text>
          <Text style={styles.badgeName}>{p.badge_name as string}</Text>
          <Text style={styles.bodyText}>Badge earned</Text>
        </View>
      );
    }

    case 'weekly_challenge_completed': {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{p.drill_name as string}</Text>
          {p.rank != null && (
            <Text style={styles.heroRank}>{ordinal(p.rank as number)}</Text>
          )}
          {p.time_seconds != null && (
            <Text style={styles.heroTimeSub}>{formatTime(p.time_seconds as number)}</Text>
          )}
        </View>
      );
    }

    case 'group_challenge_sent': {
      const names = Array.isArray(p.participant_names) ? (p.participant_names as string[]) : [];
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{p.touches_target as number} touches</Text>
          <Text style={styles.bodyText}>{p.total_participants as number} players competing</Text>
          {names.length > 0 && (
            <View style={styles.nameList}>
              {names.map((n, i) => (
                <View key={i} style={styles.nameChip}>
                  <Text style={styles.nameChipText}>{n}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      );
    }

    case 'group_challenge_completed': {
      const names = Array.isArray(p.participant_names) ? (p.participant_names as string[]) : [];
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{p.touches_target as number} touches</Text>
          <View style={styles.heroStat}>
            <Text style={styles.heroTime}>{formatTime(p.time_seconds as number)}</Text>
            <Text style={styles.heroLabel}>
              Finished {ordinal(p.rank as number)} of {p.total_participants as number}
            </Text>
          </View>
          {names.length > 0 && (
            <View style={styles.nameList}>
              {names.map((n, i) => (
                <View key={i} style={styles.nameChip}>
                  <Text style={styles.nameChipText}>{n}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      );
    }

    default:
      return null;
  }
}

// EVENT TYPE ACCENT COLOUR (mirrors EVENT_META in HomePage)
const EVENT_COLOR: Record<string, string> = {
  personal_best: '#31af4d',
  challenge_won: '#1f89ee',
  challenge_lost: '#78909C',
  challenge_sent: '#ffb724',
  challenge_accepted: '#ffb724',
  badge_earned: '#7c3aed',
  weekly_challenge_completed: '#1f89ee',
  leaderboard_top: '#ff6b35',
  training_session: '#78909C',
  group_challenge_sent: '#ff6b35',
  group_challenge_completed: '#31af4d',
};

const EVENT_LABEL: Record<string, string> = {
  personal_best: 'Personal Best',
  challenge_won: 'Challenge Won',
  challenge_lost: 'Challenge',
  challenge_sent: 'Challenge Sent',
  challenge_accepted: 'Challenge Accepted',
  badge_earned: 'Badge Earned',
  weekly_challenge_completed: 'Weekly Challenge',
  leaderboard_top: '#1 on Team',
  training_session: 'Trained',
  group_challenge_sent: 'Group Challenge',
  group_challenge_completed: 'Group Challenge',
};

interface Props {
  event: FeedEvent | null;
  teamId: string | undefined;
  onClose: () => void;
}

export default function FeedEventDetailModal({ event, teamId, onClose }: Props) {
  const insets = useSafeAreaInsets();
  if (!event) return null;

  const color = EVENT_COLOR[event.event_type] ?? '#78909C';
  const label = EVENT_LABEL[event.event_type] ?? event.event_type;

  return (
    <Modal visible={!!event} animationType='slide' transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.accentBar, { backgroundColor: color }]} />

          <View style={styles.closeRow}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <Ionicons name='close' size={20} color='#6B7280' />
            </TouchableOpacity>
          </View>

          {/* Actor header */}
          <View style={styles.actorRow}>
            <Image
              source={{ uri: event.actor_avatar ?? 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
              style={styles.actorAvatar}
            />
            <View style={styles.actorInfo}>
              <Text style={styles.actorName}>{event.actor_name}</Text>
              <Text style={styles.actorTime}>{timeAgo(event.created_at)}</Text>
            </View>
            <View style={[styles.typePill, { backgroundColor: `${color}18` }]}>
              <Text style={[styles.typePillText, { color }]}>{label}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            <EventDetail event={event} teamId={teamId} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  actorInfo: {
    flex: 1,
    gap: 2,
  },
  actorName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  actorTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B0BEC5',
  },
  typePill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  body: {
    padding: 20,
    gap: 20,
  },

  // Hero stat (big time display)
  heroStat: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  heroTime: {
    fontSize: 56,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: -1,
  },
  heroTimeSub: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  heroRank: {
    fontSize: 56,
    fontWeight: '900',
    color: '#ffb724',
    letterSpacing: -1,
  },
  heroLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  improvementPill: {
    backgroundColor: '#D1FAE5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
  },
  improvementText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#31af4d',
  },
  prevBest: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B0BEC5',
    marginTop: 2,
  },

  // Section
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  bodyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
  },

  // Leaderboard
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  leaderRowHighlight: {
    backgroundColor: '#EFF6FF',
  },
  leaderRank: {
    fontSize: 16,
    width: 28,
    textAlign: 'center',
  },
  leaderName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  leaderNameHighlight: {
    color: '#1f89ee',
  },
  leaderTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
  },
  leaderTimeHighlight: {
    color: '#1f89ee',
    fontWeight: '900',
  },

  // Head-to-head
  h2hRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  h2hSide: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  h2hSideWin: {
    backgroundColor: '#D1FAE5',
  },
  h2hName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  h2hTime: {
    fontSize: 22,
    fontWeight: '900',
    color: '#78909C',
  },
  h2hTimeWin: {
    color: '#31af4d',
  },
  h2hBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#31af4d',
  },
  h2hVs: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B0BEC5',
  },
  marginText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
    textAlign: 'center',
  },

  // Badge
  badgeCenter: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  badgeIcon: {
    fontSize: 64,
  },
  badgeName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
  },

  // Name chips (group challenges)
  nameList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  nameChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  nameChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
  },
});
