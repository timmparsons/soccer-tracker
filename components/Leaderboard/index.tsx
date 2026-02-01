import PageHeader from '@/components/common/PageHeader';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface TeamMemberStats {
  id: string;
  name: string;
  avatar_url: string | null;
  weekly_touches: number;
  today_touches: number;
  daily_target: number;
}

interface JugglingRecord {
  id: string;
  name: string;
  avatar_url: string | null;
  high_score: number;
  date_achieved: string;
}

// Helper to get local date in YYYY-MM-DD format
const getLocalDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Leaderboard = () => {
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);
  const [activeTab, setActiveTab] = useState<'touches' | 'juggling'>('touches');

  // Get today's date and week start date (using local time)
  const today = getLocalDate();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartDate = getLocalDate(weekStart);

  // Fetch team members with their touch stats
  const {
    data: touchesLeaderboard = [],
    isLoading: touchesLoading,
    refetch: refetchTouches,
  } = useQuery({
    queryKey: ['team-touches-leaderboard', profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) {
        return [];
      }

      // Get all team members (excluding coaches)
      const { data: teamMembers, error: membersError } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', profile.team_id)
        .eq('is_coach', false);

      if (membersError) throw membersError;
      if (!teamMembers || teamMembers.length === 0) return [];

      // Get touch stats for each member
      const memberStats: TeamMemberStats[] = await Promise.all(
        teamMembers.map(async (member) => {
          // Get weekly touches
          const { data: weeklyData } = await supabase
            .from('daily_sessions')
            .select('touches_logged')
            .eq('user_id', member.id)
            .gte('date', weekStartDate)
            .lte('date', today);

          const weekly_touches = weeklyData?.reduce((sum, s) => sum + (s.touches_logged || 0), 0) || 0;

          // Get today's touches
          const { data: todayData } = await supabase
            .from('daily_sessions')
            .select('touches_logged')
            .eq('user_id', member.id)
            .eq('date', today);

          const today_touches = todayData?.reduce((sum, s) => sum + (s.touches_logged || 0), 0) || 0;

          // Get user's daily target
          const { data: targetData } = await supabase
            .from('user_targets')
            .select('daily_target_touches')
            .eq('user_id', member.id)
            .single();

          return {
            id: member.id,
            name: member.name || member.display_name || 'Unknown Player',
            avatar_url: member.avatar_url,
            weekly_touches,
            today_touches,
            daily_target: targetData?.daily_target_touches || 1000,
          };
        })
      );

      // Sort by weekly touches descending
      return memberStats.sort((a, b) => b.weekly_touches - a.weekly_touches);
    },
    enabled: !!profile?.team_id,
  });

  // Fetch juggling records
  const {
    data: jugglingLeaderboard = [],
    isLoading: jugglingLoading,
    refetch: refetchJuggling,
  } = useQuery({
    queryKey: ['team-juggling-leaderboard', profile?.team_id],
    queryFn: async () => {
      if (!profile?.team_id) return [];

      // Get all team members (excluding coaches)
      const { data: teamMembers, error: membersError } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', profile.team_id)
        .eq('is_coach', false);

      if (membersError) throw membersError;
      if (!teamMembers || teamMembers.length === 0) return [];

      // Get high scores for each member
      const memberRecords: JugglingRecord[] = await Promise.all(
        teamMembers.map(async (member) => {
          // Get their best juggling session (using touches_logged as score for now)
          const { data: bestSession } = await supabase
            .from('daily_sessions')
            .select('touches_logged, date')
            .eq('user_id', member.id)
            .gt('touches_logged', 0)
            .order('touches_logged', { ascending: false })
            .limit(1)
            .single();

          return {
            id: member.id,
            name: member.name || member.display_name || 'Unknown Player',
            avatar_url: member.avatar_url,
            high_score: bestSession?.touches_logged || 0,
            date_achieved: bestSession?.date || today,
          };
        })
      );

      // Filter out those with no high score and sort descending
      return memberRecords
        .filter((r) => r.high_score > 0)
        .sort((a, b) => b.high_score - a.high_score);
    },
    enabled: !!profile?.team_id,
  });

  const isLoading = touchesLoading || jugglingLoading;

  const handleRefresh = () => {
    refetchTouches();
    refetchJuggling();
  };

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchTouches();
      refetchJuggling();
    }, [refetchProfile, refetchTouches, refetchJuggling])
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#2B9FFF' />
      </View>
    );
  }

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '';
  };

  const getCurrentUserId = () => user?.id;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.floor(
      (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title='Team Leaderboard'
        showAvatar={true}
        avatarUrl={profile?.avatar_url}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'touches' && styles.tabActive]}
          onPress={() => setActiveTab('touches')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'touches' && styles.tabTextActive,
            ]}
          >
            📊 Weekly Touches
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'juggling' && styles.tabActive]}
          onPress={() => setActiveTab('juggling')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'juggling' && styles.tabTextActive,
            ]}
          >
            ⚽ Juggling Records
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'touches' ? (
          <>
            {/* Weekly Touches View */}
            <View style={styles.weekBadgeContainer}>
              <View style={styles.weekBadge}>
                <Text style={styles.weekBadgeText}>Last 7 Days</Text>
              </View>
            </View>

            {/* Empty state for touches */}
            {touchesLeaderboard.length === 0 && !touchesLoading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No Data Yet</Text>
                <Text style={styles.emptyStateText}>
                  Team members will appear here once they start logging touches.
                </Text>
              </View>
            )}

            {/* Top 3 Podium for Touches */}
            {touchesLeaderboard.length >= 3 && (
              <View style={styles.podium}>
                {/* 2nd Place */}
                <View style={styles.podiumSpot}>
                  <Image
                    source={{
                      uri:
                        touchesLeaderboard[1].avatar_url ||
                        'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                    }}
                    style={styles.podiumAvatar2}
                  />
                  <Text style={styles.podiumMedal}>🥈</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {touchesLeaderboard[1].name}
                  </Text>
                  <Text style={styles.podiumTouches}>
                    {touchesLeaderboard[1].weekly_touches.toLocaleString()}
                  </Text>
                  <View style={styles.podiumRank2}>
                    <Text style={styles.podiumRankText}>2nd</Text>
                  </View>
                </View>

                {/* 1st Place */}
                <View style={[styles.podiumSpot, styles.podiumFirst]}>
                  <View style={styles.crownContainer}>
                    <Text style={styles.crown}>👑</Text>
                  </View>
                  <Image
                    source={{
                      uri:
                        touchesLeaderboard[0].avatar_url ||
                        'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                    }}
                    style={styles.podiumAvatar1}
                  />
                  <Text style={styles.podiumMedal}>🥇</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {touchesLeaderboard[0].name}
                  </Text>
                  <Text style={styles.podiumTouches}>
                    {touchesLeaderboard[0].weekly_touches.toLocaleString()}
                  </Text>
                  <View style={styles.podiumRank1}>
                    <Text style={styles.podiumRankText}>1st</Text>
                  </View>
                </View>

                {/* 3rd Place */}
                <View style={styles.podiumSpot}>
                  <Image
                    source={{
                      uri:
                        touchesLeaderboard[2].avatar_url ||
                        'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                    }}
                    style={styles.podiumAvatar3}
                  />
                  <Text style={styles.podiumMedal}>🥉</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {touchesLeaderboard[2].name}
                  </Text>
                  <Text style={styles.podiumTouches}>
                    {touchesLeaderboard[2].weekly_touches.toLocaleString()}
                  </Text>
                  <View style={styles.podiumRank3}>
                    <Text style={styles.podiumRankText}>3rd</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Rest of Touches List */}
            <View style={styles.listContainer}>
              {touchesLeaderboard.map((player, index) => {
                const isCurrentUser = player.id === getCurrentUserId();
                const hitTarget = player.today_touches >= player.daily_target;

                return (
                  <View
                    key={player.id}
                    style={[
                      styles.playerCard,
                      isCurrentUser && styles.currentUserCard,
                    ]}
                  >
                    <View style={styles.playerLeft}>
                      <View style={styles.rankContainer}>
                        {index < 3 ? (
                          <Text style={styles.medalEmoji}>
                            {getMedalEmoji(index)}
                          </Text>
                        ) : (
                          <Text style={styles.rankNumber}>{index + 1}</Text>
                        )}
                      </View>

                      <Image
                        source={{
                          uri:
                            player.avatar_url ||
                            'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                        }}
                        style={styles.avatar}
                      />

                      <View style={styles.playerInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.playerName}>
                            {player.name}
                            {isCurrentUser && (
                              <Text style={styles.youBadge}> (You)</Text>
                            )}
                          </Text>
                        </View>
                        <View style={styles.statsRow}>
                          <Text style={styles.todayTouches}>
                            {player.today_touches.toLocaleString()} today
                          </Text>
                          {hitTarget && (
                            <View style={styles.targetHitBadge}>
                              <Text style={styles.targetHitText}>
                                🎯 Target Hit
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={styles.playerRight}>
                      <Text style={styles.weeklyTouches}>
                        {player.weekly_touches.toLocaleString()}
                      </Text>
                      <Text style={styles.touchesLabel}>touches</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <>
            {/* Juggling Records View */}
            <View style={styles.weekBadgeContainer}>
              <View style={styles.jugglingBadge}>
                <Text style={styles.weekBadgeText}>All-Time Records</Text>
              </View>
            </View>

            {/* Empty state for juggling */}
            {jugglingLeaderboard.length === 0 && !jugglingLoading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No Juggling Records</Text>
                <Text style={styles.emptyStateText}>
                  Team members will appear here once they set juggling high scores.
                </Text>
              </View>
            )}

            {/* Top 3 Podium for Juggling */}
            {jugglingLeaderboard.length >= 3 && (
              <View style={styles.podium}>
                {/* 2nd Place */}
                <View style={styles.podiumSpot}>
                  <Image
                    source={{
                      uri:
                        jugglingLeaderboard[1].avatar_url ||
                        'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                    }}
                    style={styles.podiumAvatar2}
                  />
                  <Text style={styles.podiumMedal}>🥈</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {jugglingLeaderboard[1].name}
                  </Text>
                  <Text style={styles.podiumTouches}>
                    {jugglingLeaderboard[1].high_score}
                  </Text>
                  <View style={styles.podiumRank2}>
                    <Text style={styles.podiumRankText}>2nd</Text>
                  </View>
                </View>

                {/* 1st Place */}
                <View style={[styles.podiumSpot, styles.podiumFirst]}>
                  <View style={styles.crownContainer}>
                    <Text style={styles.crown}>👑</Text>
                  </View>
                  <Image
                    source={{
                      uri:
                        jugglingLeaderboard[0].avatar_url ||
                        'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                    }}
                    style={styles.podiumAvatar1}
                  />
                  <Text style={styles.podiumMedal}>🥇</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {jugglingLeaderboard[0].name}
                  </Text>
                  <Text style={styles.podiumTouches}>
                    {jugglingLeaderboard[0].high_score}
                  </Text>
                  <View style={styles.podiumRank1}>
                    <Text style={styles.podiumRankText}>1st</Text>
                  </View>
                </View>

                {/* 3rd Place */}
                <View style={styles.podiumSpot}>
                  <Image
                    source={{
                      uri:
                        jugglingLeaderboard[2].avatar_url ||
                        'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                    }}
                    style={styles.podiumAvatar3}
                  />
                  <Text style={styles.podiumMedal}>🥉</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {jugglingLeaderboard[2].name}
                  </Text>
                  <Text style={styles.podiumTouches}>
                    {jugglingLeaderboard[2].high_score}
                  </Text>
                  <View style={styles.podiumRank3}>
                    <Text style={styles.podiumRankText}>3rd</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Rest of Juggling List */}
            <View style={styles.listContainer}>
              {jugglingLeaderboard.map((player, index) => {
                const isCurrentUser = player.id === getCurrentUserId();

                return (
                  <View
                    key={player.id}
                    style={[
                      styles.playerCard,
                      isCurrentUser && styles.currentUserCard,
                    ]}
                  >
                    <View style={styles.playerLeft}>
                      <View style={styles.rankContainer}>
                        {index < 3 ? (
                          <Text style={styles.medalEmoji}>
                            {getMedalEmoji(index)}
                          </Text>
                        ) : (
                          <Text style={styles.rankNumber}>{index + 1}</Text>
                        )}
                      </View>

                      <Image
                        source={{
                          uri:
                            player.avatar_url ||
                            'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                        }}
                        style={styles.avatar}
                      />

                      <View style={styles.playerInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.playerName}>
                            {player.name}
                            {isCurrentUser && (
                              <Text style={styles.youBadge}> (You)</Text>
                            )}
                          </Text>
                        </View>
                        <Text style={styles.jugglingDate}>
                          {formatDate(player.date_achieved)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.playerRight}>
                      <Text style={styles.jugglingScore}>
                        {player.high_score}
                      </Text>
                      <Text style={styles.touchesLabel}>juggles</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default Leaderboard;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 20,
  },

  // TABS
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#F5F7FA',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabActive: {
    backgroundColor: '#2B9FFF',
    shadowColor: '#2B9FFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#78909C',
  },
  tabTextActive: {
    color: '#FFF',
  },

  weekBadgeContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  weekBadge: {
    backgroundColor: '#2B9FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  jugglingBadge: {
    backgroundColor: '#FF7043',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  weekBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // PODIUM
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 32,
    gap: 8,
  },
  podiumSpot: {
    alignItems: 'center',
    flex: 1,
  },
  podiumFirst: {
    marginBottom: 20,
  },
  crownContainer: {
    marginBottom: 8,
  },
  crown: {
    fontSize: 32,
  },
  podiumAvatar1: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFD700',
    marginBottom: 8,
  },
  podiumAvatar2: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#C0C0C0',
    marginBottom: 8,
  },
  podiumAvatar3: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#CD7F32',
    marginBottom: 8,
  },
  podiumMedal: {
    fontSize: 24,
    marginBottom: 4,
  },
  podiumName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumTouches: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2B9FFF',
    marginBottom: 8,
  },
  podiumRank1: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  podiumRank2: {
    backgroundColor: '#C0C0C0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  podiumRank3: {
    backgroundColor: '#CD7F32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  podiumRankText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },

  // LIST
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
    borderColor: '#2B9FFF',
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
  medalEmoji: {
    fontSize: 24,
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#78909C',
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  youBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B9FFF',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayTouches: {
    fontSize: 13,
    color: '#78909C',
    fontWeight: '600',
  },
  jugglingDate: {
    fontSize: 13,
    color: '#78909C',
    fontWeight: '600',
  },
  targetHitBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  targetHitText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#388E3C',
  },
  playerRight: {
    alignItems: 'flex-end',
  },
  weeklyTouches: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2B9FFF',
    marginBottom: 2,
  },
  jugglingScore: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FF7043',
    marginBottom: 2,
  },
  touchesLabel: {
    fontSize: 11,
    color: '#78909C',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // EMPTY STATE
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
