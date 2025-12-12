import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTeam } from '@/hooks/useTeam';
import { useTeamLeaderboard } from '@/hooks/useTeamLeaderboard';
import { useTeamStats } from '@/hooks/useTeamStats';
import { useUser } from '@/hooks/useUser';

const TeamDashboard = () => {
  const { data: user } = useUser();
  const { data: team, isLoading: loadingTeam } = useTeam(user?.id);
  const { data: stats, isLoading: loadingStats } = useTeamStats(team?.id);
  const { data: leaderboard, isLoading: loadingLeaderboard } =
    useTeamLeaderboard(team?.id);

  if (loadingTeam || loadingStats || loadingLeaderboard || !team) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading team dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 90 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{team.name} ⚽</Text>
        <Text style={styles.subtitle}>Your Juggling Crew</Text>
      </View>

      {/* Team Stats */}
      <View style={styles.teamCard}>
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {stats.avg_score?.toFixed(0) || 0}
            </Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.team_best || 0}</Text>
            <Text style={styles.statLabel}>Team Best</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total_players}</Text>
            <Text style={styles.statLabel}>Players</Text>
          </View>
        </View>
      </View>

      {/* Leaderboard Title */}
      <Text style={styles.sectionTitle}>Leaderboard</Text>

      {/* Leaderboard List */}
      <View style={styles.leaderboardCard}>
        {leaderboard.map((player, index) => (
          <View key={player.id} style={styles.playerRow}>
            <Text style={styles.rankNumber}>{index + 1}</Text>

            {/* Avatar */}
            <Image
              source={{
                uri:
                  player.avatar_url ||
                  'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
              }}
              style={styles.avatar}
            />

            {/* Name + Score */}
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{player.username}</Text>
              <Text style={styles.playerScore}>
                Best: {player.high_score || 0}
              </Text>
            </View>

            {/* Trophy */}
            {index === 0 && (
              <Ionicons name='trophy' size={24} color='#f59e0b' />
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default TeamDashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: '#6b7280', fontSize: 16 },
  header: {
    marginTop: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
  },
  teamCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    elevation: 3,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  statLabel: { fontSize: 13, color: '#6b7280' },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },

  leaderboardCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  playerRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '700',
    width: 30,
    textAlign: 'center',
    color: '#3b82f6',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  playerInfo: { flex: 1 },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  playerScore: {
    fontSize: 13,
    color: '#6b7280',
  },
});
