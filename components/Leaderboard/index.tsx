import PageHeader from '@/components/common/PageHeader';
import PlayerProfileModal from '@/components/modals/PlayerProfileModal';
import { type TeamMemberStats, useTouchesLeaderboard } from '@/hooks/useLeaderboard';
import { useTeam } from '@/hooks/useTeam';
import { useGlobalLeaderboard, type GlobalPlayer } from '@/hooks/useGlobalLeaderboard';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { recordWeeklyWin } from '@/lib/checkBadges';
import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

const getBeswickLevel = (score: number): { label: string; color: string; bg: string } => {
  if (score >= 2500) return { label: 'Dominate', color: '#D84315', bg: '#FBE9E7' };
  if (score >= 1000) return { label: 'Win', color: '#1565C0', bg: '#E3F2FD' };
  return { label: 'Turn Up', color: '#78909C', bg: '#F0F2F5' };
};

interface JugglingRecord {
  id: string;
  name: string;
  avatar_url: string | null;
  high_score: number;
  date_achieved: string;
}

const Leaderboard = () => {
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);
  const { data: team } = useTeam(user?.id);
  const [activeTab, setActiveTab] = useState<'touches' | 'juggling'>('touches');
  const [touchesPeriod, setTouchesPeriod] = useState<'today' | 'week' | 'last_week' | 'alltime' | 'global'>('today');
  const [jugglingPeriod, setJugglingPeriod] = useState<'week' | 'alltime'>('week');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const seasonStartDate = team?.season_start_date ?? null;

  // Last week's Sunday (start of last week)
  const lastWeekStart = useMemo(() => {
    const now = new Date();
    const thisSunday = new Date(now);
    thisSunday.setDate(now.getDate() - now.getDay());
    const lastSunday = new Date(thisSunday);
    lastSunday.setDate(thisSunday.getDate() - 7);
    return getLocalDate(lastSunday);
  }, []);

  // Fetch team members with their touch stats (filtered to current season)
  const {
    data: touchesLeaderboard = [],
    isLoading: touchesLoading,
    refetch: refetchTouches,
  } = useTouchesLeaderboard(profile?.team_id, seasonStartDate);

  // Fetch juggling records
  const {
    data: jugglingLeaderboard = [],
    isLoading: jugglingLoading,
    refetch: refetchJuggling,
  } = useQuery({
    queryKey: ['team-juggling-leaderboard', profile?.team_id, jugglingPeriod, seasonStartDate],
    queryFn: async () => {
      if (!profile?.team_id) return [];

      const today = getLocalDate();
      const todayObj = new Date();
      const weekStartObj = new Date();
      weekStartObj.setDate(todayObj.getDate() - todayObj.getDay());
      const weekStartDate = getLocalDate(weekStartObj);

      // Get all team members (excluding coaches)
      const { data: teamMembers, error: membersError } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', profile.team_id)
        .eq('is_coach', false);

      if (membersError) throw membersError;
      if (!teamMembers || teamMembers.length === 0) return [];

      // Get high scores for each member (only from sessions with juggle_count)
      const memberRecords: JugglingRecord[] = await Promise.all(
        teamMembers.map(async (member) => {
          // Get their best juggling session for the active period
          let query = supabase
            .from('daily_sessions')
            .select('juggle_count, date')
            .eq('user_id', member.id)
            .not('juggle_count', 'is', null)
            .gt('juggle_count', 0)
            .order('juggle_count', { ascending: false })
            .limit(1);

          if (jugglingPeriod === 'week') {
            query = query.gte('date', weekStartDate).lte('date', today);
          }
          // alltime = no date filter — return the player's best juggling session ever

          const { data: bestSession } = await query.single();

          return {
            id: member.id,
            name: member.name || member.display_name || 'Unknown Player',
            avatar_url: member.avatar_url,
            high_score: bestSession?.juggle_count || 0,
            date_achieved: bestSession?.date || getLocalDate(),
          };
        })
      );

      // Filter out those with no high score and sort descending
      return memberRecords
        .filter((r) => r.high_score > 0)
        .sort((a, b) => b.high_score - a.high_score || a.name.localeCompare(b.name));
    },
    enabled: !!profile?.team_id,
  });

  const { data: globalPlayers = [], refetch: refetchGlobal } = useGlobalLeaderboard();

  // Placeholder — wire up to useSubscription when monetization branch merges
  const isPro = !!(profile?.is_coach);

  const isLoading = touchesLoading || jugglingLoading;

  // Record last week's winner (idempotent — safe to run every load)
  useEffect(() => {
    if (!touchesLeaderboard.length || !user?.id) return;
    const lastWeekWinner = [...touchesLeaderboard].sort((a, b) => b.last_week_touches - a.last_week_touches)[0];
    if (lastWeekWinner.last_week_touches > 0) {
      recordWeeklyWin(lastWeekStart, lastWeekWinner.id, user.id);
    }
  }, [touchesLeaderboard, user?.id, lastWeekStart]);

  const handleRefresh = () => {
    refetchTouches();
    refetchJuggling();
    refetchGlobal();
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
        <ActivityIndicator size='large' color='#1f89ee' />
      </View>
    );
  }

  const sortedTouches = [...touchesLeaderboard].sort((a, b) => {
    let diff = 0;
    if (touchesPeriod === 'today') diff = b.today_touches - a.today_touches;
    else if (touchesPeriod === 'week') diff = b.weekly_touches - a.weekly_touches;
    else if (touchesPeriod === 'last_week') diff = b.last_week_touches - a.last_week_touches;
    else diff = b.alltime_best_week - a.alltime_best_week;
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  const getTouchScore = (player: TeamMemberStats) => {
    if (touchesPeriod === 'today') return player.today_touches;
    if (touchesPeriod === 'week') return player.weekly_touches;
    if (touchesPeriod === 'last_week') return player.last_week_touches;
    return player.alltime_best_week;
  };

  const scoredPlayers = sortedTouches.filter(p => getTouchScore(p) > 0);
  const showTouchesPodium = scoredPlayers.length >= 1;
  const podiumCount = Math.min(scoredPlayers.length, 3);

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  const getRankLabel = (rank: number) => {
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `${rank}th`;
  };

  const getPodiumRankStyle = (rank: number) => {
    if (rank === 1) return styles.podiumRank1;
    if (rank === 2) return styles.podiumRank2;
    return styles.podiumRank3;
  };

  const getCurrentUserId = () => user?.id;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
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
            Touches
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
            Juggling
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
            {/* Period pills */}
            <View style={styles.periodPillRow}>
              <TouchableOpacity
                style={[styles.periodPill, touchesPeriod === 'today' && styles.periodPillActive]}
                onPress={() => setTouchesPeriod('today')}
              >
                <Text style={[styles.periodPillText, touchesPeriod === 'today' && styles.periodPillTextActive]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodPill, touchesPeriod === 'week' && styles.periodPillActive]}
                onPress={() => setTouchesPeriod('week')}
              >
                <Text style={[styles.periodPillText, touchesPeriod === 'week' && styles.periodPillTextActive]}>This Week</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodPill, touchesPeriod === 'last_week' && styles.periodPillActive]}
                onPress={() => setTouchesPeriod('last_week')}
              >
                <Text style={[styles.periodPillText, touchesPeriod === 'last_week' && styles.periodPillTextActive]}>Last Week</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodPill, touchesPeriod === 'alltime' && styles.periodPillActive]}
                onPress={() => setTouchesPeriod('alltime')}
              >
                <Text style={[styles.periodPillText, touchesPeriod === 'alltime' && styles.periodPillTextActive]}>All Time</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodPill, touchesPeriod === 'global' && styles.periodPillActive]}
                onPress={() => setTouchesPeriod('global')}
              >
                <Text style={[styles.periodPillText, touchesPeriod === 'global' && styles.periodPillTextActive]}>Global</Text>
              </TouchableOpacity>
            </View>
            {touchesPeriod === 'week' && (
              <Text style={styles.resetNote}>Resets Sunday</Text>
            )}
            {touchesPeriod === 'alltime' && (
              <Text style={styles.resetNote}>Best single week ever</Text>
            )}


            {touchesPeriod === 'global' ? (
              <GlobalTabContent
                players={globalPlayers}
                currentUserId={user?.id ?? ''}
                isPro={isPro}
                onPlayerPress={(id) => setSelectedPlayerId(id)}
              />
            ) : null}

            {/* Podium — 1st left, 2nd, 3rd. List starts after podium. */}
            {touchesPeriod !== 'global' && showTouchesPodium && (
              <View style={styles.podium}>
                {/* 1st Place — left when only 2 on podium, centre when 3 */}
                {podiumCount === 1 || podiumCount === 2 ? (() => {
                  const p = scoredPlayers[0];
                  const score = getTouchScore(p);
                  const rank = scoredPlayers.filter(q => getTouchScore(q) > score).length + 1;
                  const level = score > 0 && touchesPeriod === 'today' ? getBeswickLevel(score) : null;
                  return (
                    <TouchableOpacity style={[styles.podiumSpot, styles.podiumFirst]} onPress={() => setSelectedPlayerId(p.id)} activeOpacity={0.7}>
                      <View style={styles.crownContainer}>
                        <Text style={styles.crown}>👑</Text>
                      </View>
                      <View style={styles.podiumAvatarContainer}>
                        <Image
                          source={{ uri: p.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                          style={styles.podiumAvatar1}
                        />
                        {p.today_touches >= p.daily_target && (
                          <Text style={styles.podiumTargetIcon}>🎯</Text>
                        )}
                      </View>
                      <Text style={styles.podiumMedal}>{getMedalEmoji(rank)}</Text>
                      <Text style={styles.podiumName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.podiumTouches}>{score.toLocaleString()}</Text>
                      <View style={getPodiumRankStyle(rank)}>
                        <Text style={styles.podiumRankText}>{getRankLabel(rank)}</Text>
                      </View>
                      {level && (
                        <View style={[styles.beswickBadge, { backgroundColor: level.bg }]}>
                          <Text style={[styles.beswickBadgeText, { color: level.color }]}>{level.label}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })() : null}

                {/* 2nd Place — right when 2, left when 3 */}
                {podiumCount >= 2 && (() => {
                  const p = scoredPlayers[1];
                  const score = getTouchScore(p);
                  const rank = scoredPlayers.filter(q => getTouchScore(q) > score).length + 1;
                  const level = score > 0 && touchesPeriod === 'today' ? getBeswickLevel(score) : null;
                  return (
                    <TouchableOpacity style={styles.podiumSpot} onPress={() => setSelectedPlayerId(p.id)} activeOpacity={0.7}>
                      <View style={styles.podiumAvatarContainer}>
                        <Image
                          source={{ uri: p.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                          style={styles.podiumAvatar2}
                        />
                        {p.today_touches >= p.daily_target && (
                          <Text style={styles.podiumTargetIcon}>🎯</Text>
                        )}
                      </View>
                      <Text style={styles.podiumMedal}>{getMedalEmoji(rank)}</Text>
                      <Text style={styles.podiumName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.podiumTouches}>{score.toLocaleString()}</Text>
                      <View style={getPodiumRankStyle(rank)}>
                        <Text style={styles.podiumRankText}>{getRankLabel(rank)}</Text>
                      </View>
                      {level && (
                        <View style={[styles.beswickBadge, { backgroundColor: level.bg }]}>
                          <Text style={[styles.beswickBadgeText, { color: level.color }]}>{level.label}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })()}

                {/* 1st Place — centre, only when 3 on podium */}
                {podiumCount === 3 && (() => {
                  const p = scoredPlayers[0];
                  const score = getTouchScore(p);
                  const rank = scoredPlayers.filter(q => getTouchScore(q) > score).length + 1;
                  const level = score > 0 && touchesPeriod === 'today' ? getBeswickLevel(score) : null;
                  return (
                    <TouchableOpacity style={[styles.podiumSpot, styles.podiumFirst]} onPress={() => setSelectedPlayerId(p.id)} activeOpacity={0.7}>
                      <View style={styles.crownContainer}>
                        <Text style={styles.crown}>👑</Text>
                      </View>
                      <View style={styles.podiumAvatarContainer}>
                        <Image
                          source={{ uri: p.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                          style={styles.podiumAvatar1}
                        />
                        {p.today_touches >= p.daily_target && (
                          <Text style={styles.podiumTargetIcon}>🎯</Text>
                        )}
                      </View>
                      <Text style={styles.podiumMedal}>{getMedalEmoji(rank)}</Text>
                      <Text style={styles.podiumName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.podiumTouches}>{score.toLocaleString()}</Text>
                      <View style={getPodiumRankStyle(rank)}>
                        <Text style={styles.podiumRankText}>{getRankLabel(rank)}</Text>
                      </View>
                      {level && (
                        <View style={[styles.beswickBadge, { backgroundColor: level.bg }]}>
                          <Text style={[styles.beswickBadgeText, { color: level.color }]}>{level.label}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })()}

                {/* 3rd Place — only if 3+ have scored */}
                {podiumCount >= 3 && (() => {
                  const p = scoredPlayers[2];
                  const score = getTouchScore(p);
                  const rank = scoredPlayers.filter(q => getTouchScore(q) > score).length + 1;
                  const level = score > 0 && touchesPeriod === 'today' ? getBeswickLevel(score) : null;
                  return (
                    <TouchableOpacity style={styles.podiumSpot} onPress={() => setSelectedPlayerId(p.id)} activeOpacity={0.7}>
                      <View style={styles.podiumAvatarContainer}>
                        <Image
                          source={{ uri: p.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                          style={styles.podiumAvatar3}
                        />
                        {p.today_touches >= p.daily_target && (
                          <Text style={styles.podiumTargetIcon}>🎯</Text>
                        )}
                      </View>
                      <Text style={styles.podiumMedal}>{getMedalEmoji(rank)}</Text>
                      <Text style={styles.podiumName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.podiumTouches}>{score.toLocaleString()}</Text>
                      <View style={getPodiumRankStyle(rank)}>
                        <Text style={styles.podiumRankText}>{getRankLabel(rank)}</Text>
                      </View>
                      {level && (
                        <View style={[styles.beswickBadge, { backgroundColor: level.bg }]}>
                          <Text style={[styles.beswickBadgeText, { color: level.color }]}>{level.label}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })()}
              </View>
            )}

            {/* Leaderboard list — starts at #4 when podium is visible */}
            {touchesPeriod !== 'global' && <View style={styles.listContainer}>
              {sortedTouches.slice(podiumCount).map((player) => {
                const isCurrentUser = player.id === getCurrentUserId();
                const score = getTouchScore(player);
                const rank = sortedTouches.filter(p => getTouchScore(p) > score).length + 1;
                const level = score > 0 && touchesPeriod === 'today' ? getBeswickLevel(score) : null;

                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerCard,
                      isCurrentUser && styles.currentUserCard,
                    ]}
                    onPress={() => setSelectedPlayerId(player.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.playerLeft}>
                      <View style={styles.rankContainer}>
                        <Text style={styles.rankNumber}>{rank}</Text>
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
                            {touchesPeriod === 'today' && `${player.today_touches.toLocaleString()} today`}
                            {touchesPeriod === 'week' && `${player.today_touches.toLocaleString()} today`}
                            {touchesPeriod === 'last_week' && `${player.weekly_touches.toLocaleString()} this week`}
                            {touchesPeriod === 'alltime' && `${player.weekly_touches.toLocaleString()} this week`}
                          </Text>
                        </View>
                        {level && (
                          <View style={[styles.beswickBadge, { backgroundColor: level.bg, alignSelf: 'flex-start' }]}>
                            <Text style={[styles.beswickBadgeText, { color: level.color }]}>
                              {level.label}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.playerRight}>
                      <Text style={styles.weeklyTouches}>
                        {score.toLocaleString()}
                      </Text>
                      <Text style={styles.touchesLabel}>touches</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>}
          </>
        ) : (
          <>
            {/* Period pills */}
            <View style={styles.periodPillRow}>
              <TouchableOpacity
                style={[styles.periodPill, jugglingPeriod === 'week' && styles.periodPillActive]}
                onPress={() => setJugglingPeriod('week')}
              >
                <Text style={[styles.periodPillText, jugglingPeriod === 'week' && styles.periodPillTextActive]}>This Week</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodPill, jugglingPeriod === 'alltime' && styles.periodPillActive]}
                onPress={() => setJugglingPeriod('alltime')}
              >
                <Text style={[styles.periodPillText, jugglingPeriod === 'alltime' && styles.periodPillTextActive]}>All Time</Text>
              </TouchableOpacity>
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

            {/* Podium for Juggling — mirrors touches podium */}
            {jugglingLeaderboard.length >= 1 && (() => {
              const jPodiumCount = Math.min(jugglingLeaderboard.length, 3);
              return (
                <View style={styles.podium}>
                  {/* 1st Place — left when only 1 or 2, centre when 3 */}
                  {(jPodiumCount === 1 || jPodiumCount === 2) && (() => {
                    const p = jugglingLeaderboard[0];
                    const rank = jugglingLeaderboard.filter(q => q.high_score > p.high_score).length + 1;
                    return (
                      <TouchableOpacity style={[styles.podiumSpot, styles.podiumFirst]} onPress={() => setSelectedPlayerId(p.id)} activeOpacity={0.7}>
                        <View style={styles.crownContainer}>
                          <Text style={styles.crown}>👑</Text>
                        </View>
                        <Image source={{ uri: p.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }} style={styles.podiumAvatar1} />
                        <Text style={styles.podiumMedal}>{getMedalEmoji(rank)}</Text>
                        <Text style={styles.podiumName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.podiumTouches}>{p.high_score}</Text>
                        <View style={getPodiumRankStyle(rank)}>
                          <Text style={styles.podiumRankText}>{getRankLabel(rank)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })()}

                  {/* 2nd Place — right when 2, left when 3 */}
                  {jPodiumCount >= 2 && (() => {
                    const p = jugglingLeaderboard[1];
                    const rank = jugglingLeaderboard.filter(q => q.high_score > p.high_score).length + 1;
                    return (
                      <TouchableOpacity style={styles.podiumSpot} onPress={() => setSelectedPlayerId(p.id)} activeOpacity={0.7}>
                        <Image source={{ uri: p.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }} style={styles.podiumAvatar2} />
                        <Text style={styles.podiumMedal}>{getMedalEmoji(rank)}</Text>
                        <Text style={styles.podiumName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.podiumTouches}>{p.high_score}</Text>
                        <View style={getPodiumRankStyle(rank)}>
                          <Text style={styles.podiumRankText}>{getRankLabel(rank)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })()}

                  {/* 1st Place — centre, only when 3 on podium */}
                  {jPodiumCount === 3 && (() => {
                    const p = jugglingLeaderboard[0];
                    const rank = jugglingLeaderboard.filter(q => q.high_score > p.high_score).length + 1;
                    return (
                      <TouchableOpacity style={[styles.podiumSpot, styles.podiumFirst]} onPress={() => setSelectedPlayerId(p.id)} activeOpacity={0.7}>
                        <View style={styles.crownContainer}>
                          <Text style={styles.crown}>👑</Text>
                        </View>
                        <Image source={{ uri: p.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }} style={styles.podiumAvatar1} />
                        <Text style={styles.podiumMedal}>{getMedalEmoji(rank)}</Text>
                        <Text style={styles.podiumName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.podiumTouches}>{p.high_score}</Text>
                        <View style={getPodiumRankStyle(rank)}>
                          <Text style={styles.podiumRankText}>{getRankLabel(rank)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })()}

                  {/* 3rd Place */}
                  {jPodiumCount >= 3 && (() => {
                    const p = jugglingLeaderboard[2];
                    const rank = jugglingLeaderboard.filter(q => q.high_score > p.high_score).length + 1;
                    return (
                      <TouchableOpacity style={styles.podiumSpot} onPress={() => setSelectedPlayerId(p.id)} activeOpacity={0.7}>
                        <Image source={{ uri: p.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }} style={styles.podiumAvatar3} />
                        <Text style={styles.podiumMedal}>{getMedalEmoji(rank)}</Text>
                        <Text style={styles.podiumName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.podiumTouches}>{p.high_score}</Text>
                        <View style={getPodiumRankStyle(rank)}>
                          <Text style={styles.podiumRankText}>{getRankLabel(rank)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })()}
                </View>
              );
            })()}

            {/* Juggling list — starts at #4 */}
            <View style={styles.listContainer}>
              {jugglingLeaderboard.slice(Math.min(jugglingLeaderboard.length, 3)).map((player) => {
                const isCurrentUser = player.id === getCurrentUserId();
                const rank = jugglingLeaderboard.filter(p => p.high_score > player.high_score).length + 1;

                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[styles.playerCard, isCurrentUser && styles.currentUserCard]}
                    onPress={() => setSelectedPlayerId(player.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.playerLeft}>
                      <View style={styles.rankContainer}>
                        <Text style={styles.rankNumber}>{rank}</Text>
                      </View>
                      <Image
                        source={{ uri: player.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                        style={styles.avatar}
                      />
                      <View style={styles.playerInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.playerName}>
                            {player.name}
                            {isCurrentUser && <Text style={styles.youBadge}> (You)</Text>}
                          </Text>
                        </View>
                        <Text style={styles.jugglingDate}>{formatDate(player.date_achieved)}</Text>
                      </View>
                    </View>
                    <View style={styles.playerRight}>
                      <Text style={styles.jugglingScore}>{player.high_score}</Text>
                      <Text style={styles.touchesLabel}>juggles</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <PlayerProfileModal
        playerId={selectedPlayerId}
        visible={!!selectedPlayerId}
        onClose={() => setSelectedPlayerId(null)}
      />
    </View>
  );
};

interface GlobalTabProps {
  players: GlobalPlayer[];
  currentUserId: string;
  isPro: boolean;
  onPlayerPress: (id: string) => void;
}

function GlobalTabContent({ players, currentUserId, isPro, onPlayerPress }: GlobalTabProps) {
  const myRank = players.findIndex((p) => p.id === currentUserId) + 1;
  const visiblePlayers = isPro ? players : players.slice(0, 5);
  const showMyRow = !isPro && myRank > 5;

  return (
    <View style={gStyles.container}>
      <Text style={gStyles.subtitle}>Weekly touches · resets Sunday</Text>
      {visiblePlayers.map((player, idx) => {
        const rank = idx + 1;
        const isMe = player.id === currentUserId;
        return (
          <TouchableOpacity
            key={player.id}
            style={[gStyles.row, isMe && gStyles.rowMe]}
            onPress={() => onPlayerPress(player.id)}
            activeOpacity={0.7}
          >
            <View style={gStyles.rankBox}>
              <Text style={gStyles.rankText}>{rank}</Text>
            </View>
            <Image
              source={{ uri: player.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
              style={gStyles.avatar}
            />
            <View style={gStyles.info}>
              <Text style={gStyles.name} numberOfLines={1}>
                {player.name}{isMe ? ' (You)' : ''}
              </Text>
              {player.team_name && (
                <Text style={gStyles.team} numberOfLines={1}>{player.team_name}</Text>
              )}
            </View>
            <View style={gStyles.scoreBox}>
              <Text style={gStyles.score}>{player.weekly_touches.toLocaleString()}</Text>
              <Text style={gStyles.scoreLabel}>touches</Text>
            </View>
          </TouchableOpacity>
        );
      })}
      {showMyRow && myRank > 0 && (() => {
        const me = players[myRank - 1];
        return (
          <>
            <View style={gStyles.separator}>
              <Text style={gStyles.separatorText}>· · ·</Text>
            </View>
            <TouchableOpacity
              style={[gStyles.row, gStyles.rowMe]}
              onPress={() => onPlayerPress(me.id)}
              activeOpacity={0.7}
            >
              <View style={gStyles.rankBox}>
                <Text style={gStyles.rankText}>{myRank}</Text>
              </View>
              <Image
                source={{ uri: me.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                style={gStyles.avatar}
              />
              <View style={gStyles.info}>
                <Text style={gStyles.name} numberOfLines={1}>{me.name} (You)</Text>
                {me.team_name && <Text style={gStyles.team} numberOfLines={1}>{me.team_name}</Text>}
              </View>
              <View style={gStyles.scoreBox}>
                <Text style={gStyles.score}>{me.weekly_touches.toLocaleString()}</Text>
                <Text style={gStyles.scoreLabel}>touches</Text>
              </View>
            </TouchableOpacity>
          </>
        );
      })()}
      {!isPro && (
        <View style={gStyles.paywall}>
          <Text style={gStyles.paywallText}>Upgrade to Pro to see the full leaderboard</Text>
        </View>
      )}
    </View>
  );
}

const gStyles = StyleSheet.create({
  container: {
    gap: 6,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 6,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  rowMe: {
    borderColor: '#1f89ee',
    backgroundColor: '#EBF4FF',
  },
  rankBox: {
    width: 28,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  team: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  scoreBox: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
  },
  separator: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  separatorText: {
    fontSize: 16,
    color: '#78909C',
    letterSpacing: 4,
  },
  paywall: {
    marginTop: 8,
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB724',
  },
  paywallText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    textAlign: 'center',
  },
});

const cStyles = StyleSheet.create({
  container: {
    gap: 4,
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  emptySub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
  },
  record: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recordStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  recordValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  recordLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  recordDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78909C',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  rowLeft: {
    flex: 1,
    gap: 3,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  rowDetail: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  rowTimer: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
  },
  declineBtn: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  waitingBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  waitingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
  },
  goBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  goBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
  resultRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  resultOutcome: {
    fontSize: 13,
    fontWeight: '900',
  },
  resultWon: {
    color: '#1f89ee',
  },
  resultLost: {
    color: '#78909C',
  },
  resultTimes: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
  },
  addBtn: {
    marginTop: 12,
    backgroundColor: '#1f89ee',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
  assignRow: {
    backgroundColor: '#1f89ee',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 16,
  },
  assignRowText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
  },
  completedText: {
    color: '#31af4d',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  statusBadge: {
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  statusBadgeDone: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeExpired: {
    backgroundColor: '#F3F4F6',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f89ee',
  },
  statusBadgeTextDone: {
    color: '#31af4d',
  },
  statusBadgeTextExpired: {
    color: '#78909C',
  },
  declinedChip: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});

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
    backgroundColor: '#1f89ee',
    shadowColor: '#1f89ee',
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
  resetNote: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 6,
    marginBottom: -4,
  },

  // PERIOD PILLS
  periodPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  periodPillActive: {
    backgroundColor: '#1f89ee',
  },
  periodPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
  },
  periodPillTextActive: {
    color: '#FFF',
  },

  // PODIUM
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 32,
    gap: 16,
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
    color: '#1f89ee',
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
    color: '#1f89ee',
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
  podiumAvatarContainer: {
    position: 'relative',
  },
  podiumTargetIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: 16,
  },
  beswickBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'center',
  },
  beswickBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  playerRight: {
    alignItems: 'flex-end',
  },
  weeklyTouches: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1f89ee',
    marginBottom: 2,
  },
  jugglingScore: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffb724',
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
