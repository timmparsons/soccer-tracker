import type { JugglingRecord } from '@/hooks/useJugglingLeaderboard';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Podium from './Podium';

interface Props {
  players: JugglingRecord[];
  isLoading: boolean;
  currentUserId?: string;
  onSelectPlayer: (id: string) => void;
}

const FALLBACK_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';

const getDenseRank = (score: number, scores: number[]) =>
  new Set(scores.filter((s) => s > score)).size + 1;

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  const diffDays = Math.floor(
    (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const JugglingHighScoresView = ({
  players,
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
        <Text style={styles.emptyStateTitle}>No Juggling Records</Text>
        <Text style={styles.emptyStateText}>
          Team members will appear here once they set juggling high scores.
        </Text>
      </View>
    );
  }

  const podiumCount = Math.min(players.length, 3);
  const scores = players.map((p) => p.high_score);

  return (
    <>
      <Podium
        entries={players.slice(0, 3).map((p) => ({
          id: p.id,
          name: p.name,
          avatarUrl: p.avatar_url,
          value: p.high_score,
        }))}
        onPressEntry={onSelectPlayer}
      />
      <View style={styles.listContainer}>
        {players.slice(podiumCount).map((player) => {
          const isCurrentUser = player.id === currentUserId;
          const rank = getDenseRank(player.high_score, scores);
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
                    {player.name}
                    {isCurrentUser && <Text style={styles.youBadge}> (You)</Text>}
                  </Text>
                  <Text style={styles.dateText}>
                    {formatDate(player.date_achieved)}
                  </Text>
                </View>
              </View>
              <View style={styles.playerRight}>
                <Text style={styles.jugglingScore}>{player.high_score}</Text>
                <Text style={styles.jugglingLabel}>juggles</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
};

export default JugglingHighScoresView;

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
  dateText: {
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
  jugglingScore: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffb724',
    marginBottom: 1,
  },
  jugglingLabel: {
    fontSize: 10,
    color: '#78909C',
    fontWeight: '700',
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
