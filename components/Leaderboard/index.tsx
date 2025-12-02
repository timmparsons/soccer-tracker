import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTeam } from '@/hooks/useTeam';
import { useTeamLeaderboard } from '@/hooks/useTeamLeaderboard';
import { useUser } from '@/hooks/useUser';

const LeaderboardPage = () => {
  const { data: user } = useUser();
  const { data: team, isLoading: loadingTeam } = useTeam(user?.id);
  const {
    data: leaderboard,
    isLoading: loadingLeaderboard,
    refetch: leaderboardRefetch,
  } = useTeamLeaderboard(team?.id);

  useFocusEffect(
    useCallback(() => {
      // Only refetch if team loaded
      if (team?.id && leaderboardRefetch) {
        leaderboardRefetch();
      }
    }, [team?.id, leaderboardRefetch])
  );

  if (loadingTeam || loadingLeaderboard) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#3b82f6' />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.centered}>
        <Ionicons name='people' size={40} color='#9ca3af' />
        <Text style={styles.noTeamTitle}>You&apos;re not on a team yet</Text>
        <Text style={styles.noTeamSub}>Join a team to see rankings</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{team.name} 🏅</Text>
      <Text style={styles.subtitle}>Team Leaderboard</Text>

      {!leaderboard || leaderboard.length === 0 ? (
        <Text style={styles.noPlayersText}>
          No players have recorded juggles yet.
        </Text>
      ) : (
        leaderboard.map((player: any, index: number) => {
          return (
            <View key={player.id} style={styles.row}>
              <Text style={styles.rank}>{index + 1}</Text>

              <Image
                source={{
                  uri:
                    player.avatar_url ||
                    'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                }}
                style={styles.avatar}
              />

              <View style={styles.info}>
                <Text style={styles.username}>
                  {player.display_name ||
                    player.first_name ||
                    player.username ||
                    'Player'}
                </Text>
                <Text style={styles.streak}>
                  🔥 {player.streak_days} day streak
                </Text>
              </View>

              <Text style={styles.score}>{player.high_score}</Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

export default LeaderboardPage;

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 12, color: '#6b7280' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noTeamTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  noTeamSub: {
    color: '#6b7280',
    marginTop: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 12,
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
  },
  noPlayersText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  rank: {
    width: 28,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#3b82f6',
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  info: { flex: 1 },
  username: { fontSize: 16, fontWeight: '600', color: '#111827' },
  streak: { fontSize: 12, color: '#6b7280' },
  score: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
});
