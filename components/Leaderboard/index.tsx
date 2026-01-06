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
      if (team?.id && leaderboardRefetch) {
        leaderboardRefetch();
      }
    }, [team?.id, leaderboardRefetch])
  );

  if (loadingTeam || loadingLeaderboard) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#FFA500' />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name='people' size={64} color='#2B9FFF' />
        </View>
        <Text style={styles.noTeamTitle}>No Team Yet</Text>
        <Text style={styles.noTeamSub}>
          Join a team to compete on the leaderboard
        </Text>
      </View>
    );
  }

  // Top 3 players for podium
  const topThree = leaderboard?.slice(0, 3) || [];
  const restOfPlayers = leaderboard?.slice(3) || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.headerIconBadge}>
            <Ionicons name='trophy' size={28} color='#FFD700' />
          </View>
          <View style={styles.titleContent}>
            <Text style={styles.title}>{team.name}</Text>
            <Text style={styles.subtitle}>Team Leaderboard</Text>
          </View>
        </View>
      </View>

      {!leaderboard || leaderboard.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name='bar-chart-outline' size={64} color='#9CA3AF' />
          </View>
          <Text style={styles.emptyTitle}>No Rankings Yet</Text>
          <Text style={styles.emptyText}>
            Complete training sessions to appear on the leaderboard
          </Text>
        </View>
      ) : (
        <>
          {/* TOP 3 PODIUM */}
          {topThree.length > 0 && (
            <View style={styles.podiumSection}>
              <Text style={styles.sectionTitle}>Top Performers</Text>
              <View style={styles.podiumContainer}>
                {/* 2nd Place */}
                {topThree[1] && (
                  <View style={[styles.podiumCard, styles.podiumSecond]}>
                    <View style={styles.podiumRankBadge}>
                      <Text style={styles.podiumRankText}>2</Text>
                    </View>
                    <View style={styles.avatarContainer}>
                      <Image
                        source={{
                          uri:
                            topThree[1].avatar_url ||
                            'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                        }}
                        style={styles.podiumAvatar}
                      />
                      <View style={[styles.medalBadge, styles.silverMedal]}>
                        <Ionicons name='medal' size={16} color='#9CA3AF' />
                      </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {topThree[1].display_name ||
                        topThree[1].first_name ||
                        topThree[1].username ||
                        'Player'}
                    </Text>
                    <Text style={styles.podiumScore}>
                      {topThree[1].high_score}
                    </Text>
                    <Text style={styles.podiumLabel}>juggles</Text>
                  </View>
                )}

                {/* 1st Place */}
                {topThree[0] && (
                  <View style={[styles.podiumCard, styles.podiumFirst]}>
                    <View style={styles.crownIcon}>
                      <Text style={styles.crownEmoji}>👑</Text>
                    </View>
                    <View style={styles.podiumRankBadge}>
                      <Text style={styles.podiumRankText}>1</Text>
                    </View>
                    <View style={styles.avatarContainer}>
                      <Image
                        source={{
                          uri:
                            topThree[0].avatar_url ||
                            'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                        }}
                        style={styles.podiumAvatarFirst}
                      />
                      <View style={[styles.medalBadge, styles.goldMedal]}>
                        <Ionicons name='medal' size={20} color='#FFD700' />
                      </View>
                    </View>
                    <Text style={styles.podiumNameFirst} numberOfLines={1}>
                      {topThree[0].display_name ||
                        topThree[0].first_name ||
                        topThree[0].username ||
                        'Player'}
                    </Text>
                    <Text style={styles.podiumScoreFirst}>
                      {topThree[0].high_score}
                    </Text>
                    <Text style={styles.podiumLabel}>juggles</Text>
                  </View>
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                  <View style={[styles.podiumCard, styles.podiumThird]}>
                    <View style={styles.podiumRankBadge}>
                      <Text style={styles.podiumRankText}>3</Text>
                    </View>
                    <View style={styles.avatarContainer}>
                      <Image
                        source={{
                          uri:
                            topThree[2].avatar_url ||
                            'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                        }}
                        style={styles.podiumAvatar}
                      />
                      <View style={[styles.medalBadge, styles.bronzeMedal]}>
                        <Ionicons name='medal' size={16} color='#CD7F32' />
                      </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {topThree[2].display_name ||
                        topThree[2].first_name ||
                        topThree[2].username ||
                        'Player'}
                    </Text>
                    <Text style={styles.podiumScore}>
                      {topThree[2].high_score}
                    </Text>
                    <Text style={styles.podiumLabel}>juggles</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* REST OF LEADERBOARD */}
          {restOfPlayers.length > 0 && (
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>All Rankings</Text>
              {restOfPlayers.map((player: any, index: number) => {
                const actualRank = index + 4;
                return (
                  <View key={player.id} style={styles.row}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rank}>{actualRank}</Text>
                    </View>

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
                      <View style={styles.streakRow}>
                        <Ionicons name='flame' size={14} color='#FFA500' />
                        <Text style={styles.streak}>
                          {player.streak_days} day streak
                        </Text>
                      </View>
                    </View>

                    <View style={styles.scoreContainer}>
                      <Text style={styles.score}>{player.high_score}</Text>
                      <Text style={styles.scoreLabel}>juggles</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

export default LeaderboardPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
    paddingHorizontal: 30,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(43, 159, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  noTeamTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 8,
  },
  noTeamSub: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },

  // HEADER
  header: {
    marginTop: 40,
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2C3E50',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // EMPTY STATE
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 8,
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
  },

  // PODIUM SECTION
  podiumSection: {
    marginBottom: 32,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 8,
  },
  podiumCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  podiumFirst: {
    flex: 1,
    borderWidth: 3,
    borderColor: '#FFD700',
    paddingVertical: 20,
  },
  podiumSecond: {
    flex: 0.9,
    borderWidth: 2,
    borderColor: '#9CA3AF',
  },
  podiumThird: {
    flex: 0.9,
    borderWidth: 2,
    borderColor: '#CD7F32',
  },
  crownIcon: {
    position: 'absolute',
    top: -16,
    zIndex: 10,
  },
  crownEmoji: {
    fontSize: 32,
  },
  podiumRankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2B9FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  podiumRankText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  podiumAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  podiumAvatarFirst: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFD700',
  },
  medalBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  goldMedal: {
    borderColor: '#FFD700',
  },
  silverMedal: {
    borderColor: '#9CA3AF',
  },
  bronzeMedal: {
    borderColor: '#CD7F32',
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumNameFirst: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 6,
    textAlign: 'center',
  },
  podiumScore: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFA500',
  },
  podiumScoreFirst: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFD700',
  },
  podiumLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },

  // LIST SECTION
  listSection: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rank: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2B9FFF',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#F5F9FF',
  },
  info: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streak: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2C3E50',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
});
