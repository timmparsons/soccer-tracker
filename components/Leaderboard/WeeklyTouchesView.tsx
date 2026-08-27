import type { TeamMemberStats } from '@/hooks/useLeaderboard';
import { getTeamDisplayNames } from '@/utils/teamLeaderboardName';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Podium from './Podium';
import type { TouchesPeriod } from './TouchesPeriodDropdown';

interface Props {
  players: TeamMemberStats[];
  period: TouchesPeriod;
  isLoading: boolean;
  currentUserId?: string;
  onSelectPlayer: (id: string) => void;
}

const FALLBACK_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

const getDenseRank = (score: number, scores: number[]) =>
  new Set(scores.filter((s) => s > score)).size + 1;

const WeeklyTouchesView = ({
  players,
  period,
  isLoading,
  currentUserId,
  onSelectPlayer,
}: Props) => {
  if (isLoading) {
    return (
      <ActivityIndicator size='large' color='#1f89ee' style={styles.spinner} />
    );
  }

  if (players.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>
          {period === 'today' ? 'No activity yet today' : 'No activity yet this week'}
        </Text>
        <Text style={styles.emptyStateText}>
          Team members will appear here once they log touches.
        </Text>
      </View>
    );
  }

  const teamDisplayNames = getTeamDisplayNames(players);
  const teamName = (p: TeamMemberStats) => teamDisplayNames[p.id] ?? p.name;
  const valueOf = (p: TeamMemberStats) =>
    period === 'today' ? p.today_touches : p.weekly_touches;

  const scoredPlayers = players.filter((p) => valueOf(p) > 0);
  const podiumCount = Math.min(scoredPlayers.length, 3);
  const scores = players.map(valueOf);

  return (
    <>
      <Podium
        entries={scoredPlayers.slice(0, 3).map((p) => ({
          id: p.id,
          name: teamName(p),
          avatarUrl: p.avatar_url,
          value: valueOf(p),
          targetHit: p.today_touches >= p.daily_target,
          streak: p.current_streak,
        }))}
        onPressEntry={onSelectPlayer}
      />
      <View style={styles.listContainer}>
        {players.slice(podiumCount).map((player) => {
          const isCurrentUser = player.id === currentUserId;
          const rank = getDenseRank(valueOf(player), scores);
          return (
            <TouchableOpacity
              key={player.id}
              style={[styles.playerCard, isCurrentUser && styles.currentUserCard]}
              onPress={() => onSelectPlayer(player.id)}
              activeOpacity={0.7}
            >
              <View style={styles.playerLeft}>
                <View style={styles.rankContainer}>
                  <Text style={styles.rankNumber}>{rank}</Text>
                </View>
                <Image
                  source={{ uri: player.avatar_url || FALLBACK_AVATAR }}
                  style={styles.avatar}
                />
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>
                    {teamName(player)}
                    {isCurrentUser && <Text style={styles.youBadge}> (You)</Text>}
                  </Text>
                  <Text style={styles.todayTouches}>
                    {period === 'today'
                      ? `${player.weekly_touches.toLocaleString()} this week`
                      : `${player.today_touches.toLocaleString()} today`}
                  </Text>
                </View>
              </View>
              <View style={styles.playerRight}>
                <Text style={styles.weeklyTouches}>
                  {valueOf(player).toLocaleString()}
                </Text>
                <Text style={styles.touchesLabel}>touches</Text>
                {player.current_streak >= 2 && (
                  <View style={styles.streakBadge}>
                    <Ionicons name='flame' size={10} color='#ffb724' />
                    <Text style={styles.streakBadgeText}>{player.current_streak}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
};

export default WeeklyTouchesView;

const styles = StyleSheet.create({
  spinner: {
    marginTop: 40,
  },
  listContainer: {
    gap: 12,
  },
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  currentUserCard: {
    borderWidth: 2,
    borderColor: '#1f89ee',
    backgroundColor: '#F3F4FF',
  },
  playerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  youBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f89ee',
  },
  todayTouches: {
    fontSize: 13,
    color: '#78909C',
    fontWeight: '600',
  },
  playerRight: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 72,
  },
  weeklyTouches: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1f89ee',
    marginBottom: 1,
  },
  touchesLabel: {
    fontSize: 10,
    color: '#78909C',
    fontWeight: '700',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 5,
  },
  streakBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffb724',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
});
