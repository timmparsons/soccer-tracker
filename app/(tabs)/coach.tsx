import { useCoachTeams } from '@/hooks/useCoachTeams';
import { useCoachingTips } from '@/hooks/useCoachingTips';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PlayerStats {
  id: string;
  name: string;
  display_name: string;
  avatar_url: string | null;
  today_touches: number;
  week_touches: number;
  total_touches: number;
  total_sessions: number;
  last_session_date: string | null;
  current_streak: number;
  daily_target: number;
  week_minutes: number;
  week_tpm: number;
  days_active_this_week: number;
  best_juggle: number;
  challenges_completed: number;
}

export default function CoachDashboard() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const { data: coachTeams = [], refetch: refetchCoachTeams } = useCoachTeams(user?.id);

  // Team switcher state
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [switchingTeam, setSwitchingTeam] = useState(false);

  // Modal state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTab, setModalTab] = useState<'log' | 'edit'>('log');
  const [touchCount, setTouchCount] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Edit session state
  const [editSessions, setEditSessions] = useState<{ id: string; date: string; touches_logged: number }[]>([]);
  const [loadingEditSessions, setLoadingEditSessions] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editCount, setEditCount] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Get team info
  const { data: team } = useQuery({
    queryKey: ['coach-team', profile?.team_id],
    enabled: !!profile?.team_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', profile!.team_id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Get team players with comprehensive stats
  const {
    data: teamPlayers,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['coach-team-players', profile?.team_id],
    enabled: !!profile?.team_id,
    refetchInterval: 30_000,
    queryFn: async () => {
      // Get all players on the team (excluding coaches)
      const { data: players, error: playersError } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', profile!.team_id)
        .eq('is_coach', false);

      if (playersError) throw playersError;
      if (!players || players.length === 0) return [];

      const today = getLocalDate();
      const todayObj = new Date();
      const weekStartObj = new Date(todayObj);
      weekStartObj.setDate(todayObj.getDate() - todayObj.getDay()); // rewind to Sunday
      const weekStart = getLocalDate(weekStartObj);

      const playerIds = players.map((p) => p.id);

      // Batch fetch all sessions, targets, and challenges in 3 queries
      const [{ data: allSessionsRaw }, { data: allTargetsRaw }, { data: challengeData }] = await Promise.all([
        supabase
          .from('daily_sessions')
          .select('user_id, touches_logged, duration_minutes, date, created_at, juggle_count')
          .in('user_id', playerIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_targets')
          .select('user_id, daily_target_touches')
          .in('user_id', playerIds),
        supabase
          .from('player_challenges')
          .select('challenger_id, challenged_id')
          .or(`challenger_id.in.(${playerIds.join(',')}),challenged_id.in.(${playerIds.join(',')})`)
          .eq('status', 'completed'),
      ]);

      const challengesByPlayer: Record<string, number> = {};
      for (const c of challengeData || []) {
        challengesByPlayer[c.challenger_id] = (challengesByPlayer[c.challenger_id] ?? 0) + 1;
        challengesByPlayer[c.challenged_id] = (challengesByPlayer[c.challenged_id] ?? 0) + 1;
      }

      // Build lookup maps
      type SessionRow = NonNullable<typeof allSessionsRaw>[number];
      const sessionsByPlayer: Record<string, SessionRow[]> = {};
      for (const s of allSessionsRaw || []) {
        if (!sessionsByPlayer[s.user_id]) sessionsByPlayer[s.user_id] = [];
        sessionsByPlayer[s.user_id].push(s);
      }
      const targetByPlayer: Record<string, number> = {};
      for (const t of allTargetsRaw || []) {
        targetByPlayer[t.user_id] = t.daily_target_touches;
      }

      const playersWithStats: PlayerStats[] = players.map((player) => {
        const allSessions = sessionsByPlayer[player.id] || [];
        const weekSessions = allSessions.filter((s) => s.date >= weekStart);

        const todayTouches = allSessions
          .filter((s) => s.date === today)
          .reduce((sum, s) => sum + s.touches_logged, 0);

        const weekTouches = weekSessions.reduce((sum, s) => sum + s.touches_logged, 0);
        const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        const weekTpm = weekMinutes > 0 ? Math.round(weekTouches / weekMinutes) : 0;
        const totalTouches = allSessions.reduce((sum, s) => sum + s.touches_logged, 0);
        const uniqueWeekDays = new Set(weekSessions.map((s) => s.date)).size;

        const bestJuggle = allSessions.reduce((max, s) => {
          const jc = s.juggle_count ?? 0;
          return jc > max ? jc : max;
        }, 0);

        // Calculate streak (fixed: use local midnight to avoid UTC offset issues)
        const uniqueDates = [...new Set(allSessions.map((s) => s.date))].sort().reverse();
        let streak = 0;
        let checkDate = new Date();

        for (const dateStr of uniqueDates) {
          const sessionDate = new Date(dateStr + 'T00:00:00');
          const diffDays = Math.floor(
            (checkDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diffDays <= 1) {
            streak++;
            checkDate = sessionDate;
          } else {
            break;
          }
        }

        return {
          id: player.id,
          name: player.name,
          display_name: player.display_name,
          avatar_url: player.avatar_url,
          today_touches: todayTouches,
          week_touches: weekTouches,
          total_touches: totalTouches,
          total_sessions: allSessions.length,
          last_session_date: allSessions[0]?.created_at || null,
          current_streak: streak,
          daily_target: targetByPlayer[player.id] || 1000,
          week_minutes: weekMinutes,
          week_tpm: weekTpm,
          days_active_this_week: Math.min(uniqueWeekDays, 7),
          best_juggle: bestJuggle,
          challenges_completed: challengesByPlayer[player.id] ?? 0,
        };
      });

      // Sort by week touches (most active first)
      return playersWithStats.sort((a, b) => b.week_touches - a.week_touches);
    },
  });

  // Refetch on focus
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchProfile();
      refetchCoachTeams();
    }, [refetch, refetchProfile, refetchCoachTeams])
  );

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // AI coaching tips — compute params from teamPlayers directly (hook must be before early returns)
  const tipsParams = (() => {
    if (!teamPlayers || teamPlayers.length === 0) return null;
    const now = Date.now();
    const activeCount = teamPlayers.filter(
      (p) => p.last_session_date && new Date(p.last_session_date).getTime() > now - 3 * 24 * 60 * 60 * 1000
    ).length;
    const inactiveNames = teamPlayers
      .filter((p) => !p.last_session_date || new Date(p.last_session_date).getTime() < now - 7 * 24 * 60 * 60 * 1000)
      .slice(0, 3)
      .map((p) => p.display_name || p.name);
    const totalMins = teamPlayers.reduce((s, p) => s + p.week_minutes, 0);
    const totalWeekTouches = teamPlayers.reduce((s, p) => s + p.week_touches, 0);
    const avgTpm = totalMins > 0 ? Math.round(totalWeekTouches / totalMins) : 0;
    const top = teamPlayers[0];
    return {
      playerCount: teamPlayers.length,
      activePlayers: activeCount,
      inactivePlayers: inactiveNames,
      avgTpm,
      topPlayerName: top?.display_name || top?.name,
      topPlayerWeekTouches: top?.week_touches ?? 0,
      avgWeekTouches: Math.round(totalWeekTouches / teamPlayers.length),
    };
  })();

  const { data: tips = [], isFetching: tipsFetching } = useCoachingTips(
    profile?.team_id ?? undefined,
    tipsParams,
  );

  // Redirect if not a coach
  if (!profile?.is_coach) {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={48} color="#6B7280" />
        <Text style={styles.accessDeniedText}>Coach Access Only</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#ffb724" />
      </View>
    );
  }

  // Calculate comprehensive team stats
  const totalPlayers = teamPlayers?.length || 0;
  const activePlayers = teamPlayers?.filter((p) => {
    if (!p.last_session_date) return false;
    const lastSession = new Date(p.last_session_date);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return lastSession > threeDaysAgo;
  }).length || 0;

  const inactivePlayers = teamPlayers?.filter((p) => {
    if (!p.last_session_date) return true;
    const lastSession = new Date(p.last_session_date);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return lastSession < sevenDaysAgo;
  }) || [];

  const teamTodayTouches = teamPlayers?.reduce((sum, p) => sum + p.today_touches, 0) || 0;
  const teamWeekTouches = teamPlayers?.reduce((sum, p) => sum + p.week_touches, 0) || 0;
  const teamTotalTouches = teamPlayers?.reduce((sum, p) => sum + p.total_touches, 0) || 0;

  // Team averages
  const avgWeekTouches = totalPlayers > 0 ? Math.round(teamWeekTouches / totalPlayers) : 0;
  const avgDailyTouches = totalPlayers > 0 ? Math.round(teamWeekTouches / 7 / totalPlayers) : 0;

  // Team TPM (weighted average)
  const totalWeekMinutes = teamPlayers?.reduce((sum, p) => sum + p.week_minutes, 0) || 0;
  const teamAvgTpm = totalWeekMinutes > 0 ? Math.round(teamWeekTouches / totalWeekMinutes) : 0;

  // Players who hit their target today
  const playersHitTarget = teamPlayers?.filter((p) => p.today_touches >= p.daily_target).length || 0;

  // Top performer this week
  const topPerformer = teamPlayers && teamPlayers.length > 0 ? teamPlayers[0] : null;

  // Handle opening modal for a player
  const handlePlayerPress = (player: PlayerStats) => {
    setSelectedPlayer(player);
    setTouchCount('');
    setDurationMinutes('');
    setModalTab('log');
    setEditSessions([]);
    setEditingSessionId(null);
    setEditCount('');
    setModalVisible(true);
  };

  const handleSwitchToEdit = async (playerId: string) => {
    setModalTab('edit');
    setLoadingEditSessions(true);
    try {
      const { data } = await supabase
        .from('daily_sessions')
        .select('id, date, touches_logged')
        .eq('user_id', playerId)
        .order('date', { ascending: false })
        .limit(10);
      setEditSessions(data || []);
    } finally {
      setLoadingEditSessions(false);
    }
  };

  const handleUpdateSession = async () => {
    const count = parseInt(editCount, 10);
    if (!count || count <= 0 || isNaN(count) || !editingSessionId) return;

    setEditSaving(true);
    try {
      const { error } = await supabase
        .from('daily_sessions')
        .update({ touches_logged: count })
        .eq('id', editingSessionId);
      if (error) throw error;
      Alert.alert('Updated!', 'Session score updated.');
      await refetch();
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to update session.');
    } finally {
      setEditSaving(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setTouchCount('');
    setDurationMinutes('');
    setSelectedPlayer(null);
    setEditSessions([]);
    setEditingSessionId(null);
    setEditCount('');
  };

  // Handle saving touches for a player
  const handleSaveTouches = async () => {
    const count = parseInt(touchCount, 10);

    if (!count || count <= 0 || isNaN(count)) {
      Alert.alert('Invalid Count', 'Please enter a valid touch count');
      return;
    }

    if (!selectedPlayer) return;

    setSaving(true);

    try {
      const today = getLocalDate();
      const duration = durationMinutes ? parseInt(durationMinutes, 10) : null;

      const { error } = await supabase.from('daily_sessions').insert({
        user_id: selectedPlayer.id,
        touches_logged: count,
        duration_minutes: duration,
        date: today,
      });

      if (error) throw error;

      Alert.alert(
        'Touches Logged!',
        `${count.toLocaleString()} touches recorded for ${selectedPlayer.display_name || selectedPlayer.name}`
      );

      await refetch();
      setModalVisible(false);
      setTouchCount('');
      setDurationMinutes('');
      setSelectedPlayer(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to save touches. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchTeam = async (teamId: string) => {
    if (!user?.id || teamId === profile?.team_id) {
      setSwitcherVisible(false);
      return;
    }
    setSwitchingTeam(true);
    await supabase.from('profiles').update({ team_id: teamId }).eq('id', user.id);
    await refetchProfile();
    setSwitchingTeam(false);
    setSwitcherVisible(false);
  };

  // Remove player from team
  const handleRemovePlayer = (player: PlayerStats) => {
    Alert.alert(
      'Remove Player',
      `Remove ${player.display_name || player.name} from the team? They can rejoin with the team code.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('profiles')
                .update({ team_id: null })
                .eq('id', player.id);
              if (error) throw error;
              await refetch();
            } catch {
              Alert.alert('Error', 'Failed to remove player. Please try again.');
            }
          },
        },
      ],
    );
  };

  // Format last active time
  const formatLastActive = (dateStr: string | null) => {
    if (!dateStr) return 'Never';

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  // Get TPM color
  const getTpmColor = (tpm: number) => {
    if (tpm === 0) return '#9CA3AF';
    if (tpm < 30) return '#EF4444';
    if (tpm < 50) return '#F59E0B';
    if (tpm < 80) return '#22C55E';
    return '#31af4d';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="clipboard" size={32} color="#ffb724" />
          </View>
          <View style={styles.headerTextContainer}>
            {coachTeams.length > 1 ? (
              <TouchableOpacity style={styles.teamSwitcherPill} onPress={() => setSwitcherVisible(true)} activeOpacity={0.7}>
                <Text style={styles.headerTitle} numberOfLines={1}>{team?.name || 'My Team'}</Text>
                <Ionicons name="chevron-down" size={16} color="#ffb724" />
              </TouchableOpacity>
            ) : (
              <Text style={styles.headerTitle}>{team?.name || 'My Team'}</Text>
            )}
            <Text style={styles.headerSubtitle}>
              {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'} • {activePlayers} active
            </Text>
          </View>
        </View>

        {/* Team Overview Card */}
        <View style={styles.overviewCard}>
          <Text style={styles.sectionTitle}>Team Overview</Text>

          <View style={styles.overviewGrid}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewEmoji}>📊</Text>
              <Text style={styles.overviewValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{teamTodayTouches.toLocaleString()}</Text>
              <Text style={styles.overviewLabel}>Today</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewEmoji}>📈</Text>
              <Text style={styles.overviewValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{teamWeekTouches.toLocaleString()}</Text>
              <Text style={styles.overviewLabel}>This Week</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewEmoji}>🏆</Text>
              <Text style={styles.overviewValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{teamTotalTouches.toLocaleString()}</Text>
              <Text style={styles.overviewLabel}>All Time</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Avg Daily/Player</Text>
              <Text style={styles.statValue}>{avgDailyTouches.toLocaleString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Team Tempo</Text>
              <Text style={[styles.statValue, { color: getTpmColor(teamAvgTpm) }]}>
                {teamAvgTpm > 0 ? `${teamAvgTpm}/min` : 'N/A'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Hit Target Today</Text>
              <Text style={styles.statValue}>{playersHitTarget}/{totalPlayers}</Text>
            </View>
          </View>
        </View>

        {/* AI Training Tips */}
        {(tips.length > 0 || tipsFetching) && (
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Text style={styles.tipsTitle}>Training Tips</Text>
              <TouchableOpacity
                onPress={() => queryClient.invalidateQueries({ queryKey: ['coaching-tips', profile?.team_id] })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="refresh-outline" size={18} color="#1f89ee" />
              </TouchableOpacity>
            </View>
            {tipsFetching && tips.length === 0 ? (
              <ActivityIndicator color="#1f89ee" style={{ marginVertical: 12 }} />
            ) : (
              tips.map((tip, i) => (
                <View key={i}>
                  {i > 0 && <View style={styles.tipDivider} />}
                  <View style={styles.tipRow}>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <Text style={styles.tipBody}>{tip.body}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Top Performer Card */}
        {topPerformer && topPerformer.week_touches > 0 && (
          <View style={styles.topPerformerCard}>
            <View style={styles.topPerformerHeader}>
              <Text style={styles.topPerformerEmoji}>⭐</Text>
              <Text style={styles.topPerformerTitle}>Top Performer This Week</Text>
            </View>
            <View style={styles.topPerformerContent}>
              <Image
                source={{
                  uri: topPerformer.avatar_url ||
                    'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                }}
                style={styles.topPerformerAvatar}
              />
              <View style={styles.topPerformerInfo}>
                <Text style={styles.topPerformerName}>
                  {topPerformer.display_name || topPerformer.name}
                </Text>
                <Text style={styles.topPerformerStats}>
                  {topPerformer.week_touches.toLocaleString()} touches • {topPerformer.days_active_this_week} days active
                </Text>
              </View>
              <View style={styles.topPerformerBadge}>
                <Text style={styles.topPerformerBadgeText}>🔥 {topPerformer.current_streak}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Player Rankings */}
        <View style={styles.playerList}>
          <Text style={styles.sectionTitle}>Player Rankings</Text>

          {teamPlayers && teamPlayers.length > 0 ? (
            teamPlayers.map((player) => {
              const rank = teamPlayers.filter((p) => p.week_touches > player.week_touches).length + 1;
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

              return (
                <TouchableOpacity
                  key={player.id}
                  style={styles.playerCard}
                  onPress={() => handlePlayerPress(player)}
                  activeOpacity={0.7}
                >
                  <View style={styles.playerRow}>
                    {/* Rank */}
                    <View style={styles.rankCol}>
                      {medal ? (
                        <Text style={styles.medalEmoji}>{medal}</Text>
                      ) : (
                        <View style={styles.rankPill}>
                          <Text style={styles.rankText}>{rank}</Text>
                        </View>
                      )}
                    </View>

                    {/* Avatar */}
                    <Image
                      source={{
                        uri: player.avatar_url ||
                          'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                      }}
                      style={styles.playerAvatar}
                    />

                    {/* Name + meta */}
                    <View style={styles.playerInfo}>
                      <View style={styles.playerNameRow}>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {player.display_name || player.name || 'Player'}
                        </Text>
                        {player.current_streak > 0 && (
                          <View style={styles.streakBadge}>
                            <Text style={styles.streakText}>🔥 {player.current_streak}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.playerLastActive}>
                        {formatLastActive(player.last_session_date)}
                        {player.today_touches > 0 && ` • ${player.today_touches.toLocaleString()} today`}
                      </Text>
                    </View>

                    {/* Stats */}
                    <View style={styles.playerRightCol}>
                      <Text style={styles.playerWeekTouches}>{player.week_touches.toLocaleString()}</Text>
                      <Text style={styles.playerWeekLabel}>this week</Text>
                      {player.challenges_completed > 0 && (
                        <Text style={styles.challengeCount}>⚔️ {player.challenges_completed}</Text>
                      )}
                    </View>

                    {/* Remove */}
                    <TouchableOpacity
                      style={styles.removePlayerBtn}
                      onPress={(e) => { e.stopPropagation(); handleRemovePlayer(player); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.addTouchesHint}>
                    <Ionicons name="add-circle-outline" size={14} color="#1f89ee" />
                    <Text style={styles.addTouchesText}>Tap to log touches</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>No players yet</Text>
              <Text style={styles.emptyStateHint}>
                Add players from your Profile page
              </Text>
            </View>
          )}
        </View>

        {/* Needs Attention Section */}
        {inactivePlayers.length > 0 && (
          <View style={styles.attentionCard}>
            <View style={styles.attentionHeader}>
              <Ionicons name="alert-circle" size={20} color="#F59E0B" />
              <Text style={styles.attentionTitle}>Needs Attention</Text>
              <View style={styles.attentionBadge}>
                <Text style={styles.attentionBadgeText}>{inactivePlayers.length}</Text>
              </View>
            </View>
            <Text style={styles.attentionSubtitle}>
              Players who haven't trained in 7+ days
            </Text>
            <View style={styles.attentionList}>
              {inactivePlayers.slice(0, 3).map((player) => (
                <TouchableOpacity
                  key={player.id}
                  style={styles.attentionPlayer}
                  onPress={() => handlePlayerPress(player)}
                >
                  <Text style={styles.attentionPlayerName}>
                    {player.display_name || player.name}
                  </Text>
                  <Text style={styles.attentionPlayerTime}>
                    {formatLastActive(player.last_session_date)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* TEAM SWITCHER MODAL */}
      {coachTeams.length > 1 && (
        <Modal transparent visible={switcherVisible} animationType="fade" onRequestClose={() => setSwitcherVisible(false)}>
          <TouchableOpacity style={styles.switcherOverlay} activeOpacity={1} onPress={() => setSwitcherVisible(false)}>
            <View style={styles.switcherSheet}>
              <Text style={styles.switcherTitle}>Switch Team</Text>
              {coachTeams.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.switcherRow, t.id === profile?.team_id && styles.switcherRowActive]}
                  onPress={() => handleSwitchTeam(t.id)}
                  disabled={switchingTeam}
                >
                  <Text style={[styles.switcherRowText, t.id === profile?.team_id && styles.switcherRowTextActive]}>
                    {t.name}
                  </Text>
                  {t.id === profile?.team_id && <Ionicons name="checkmark" size={18} color="#1f89ee" />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.switcherCreateRow}
                onPress={() => { setSwitcherVisible(false); router.push('/(modals)/create-team'); }}
              >
                <Ionicons name="add-circle-outline" size={18} color="#1f89ee" />
                <Text style={styles.switcherCreateText}>Create New Team</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* ADD TOUCHES MODAL */}
      <Modal transparent visible={modalVisible} animationType="slide" onRequestClose={closeModal} statusBarTranslucent={Platform.OS === 'android'}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalOverlay}
            onPress={closeModal}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalWrapper}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Ionicons name="football" size={32} color="#1f89ee" />
                  <Text style={styles.modalTitle}>
                    {selectedPlayer?.display_name || selectedPlayer?.name}
                  </Text>
                </View>

                {/* Tab switcher */}
                <View style={styles.modalTabs}>
                  <TouchableOpacity
                    style={[styles.modalTab, modalTab === 'log' && styles.modalTabActive]}
                    onPress={() => setModalTab('log')}
                  >
                    <Text style={[styles.modalTabText, modalTab === 'log' && styles.modalTabTextActive]}>
                      Log Touches
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalTab, modalTab === 'edit' && styles.modalTabActive]}
                    onPress={() => selectedPlayer && handleSwitchToEdit(selectedPlayer.id)}
                  >
                    <Text style={[styles.modalTabText, modalTab === 'edit' && styles.modalTabTextActive]}>
                      Edit Session
                    </Text>
                  </TouchableOpacity>
                </View>

                {modalTab === 'log' ? (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Touch Count *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter touch count"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        value={touchCount}
                        onChangeText={setTouchCount}
                        autoFocus
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Duration (minutes)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Optional - for tempo tracking"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        value={durationMinutes}
                        onChangeText={setDurationMinutes}
                      />
                      <Text style={styles.inputHint}>
                        Adding duration helps track training intensity
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                      onPress={handleSaveTouches}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.saveButtonText}>Log Touches</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {loadingEditSessions ? (
                      <ActivityIndicator color="#1f89ee" style={{ marginVertical: 24 }} />
                    ) : editingSessionId ? (
                      <>
                        <Text style={styles.inputLabel}>New Touch Count</Text>
                        <TextInput
                          style={[styles.input, { marginBottom: 16 }]}
                          keyboardType="number-pad"
                          value={editCount}
                          onChangeText={setEditCount}
                          autoFocus
                        />
                        <TouchableOpacity
                          style={[styles.saveButton, editSaving && styles.saveButtonDisabled]}
                          onPress={handleUpdateSession}
                          disabled={editSaving}
                        >
                          {editSaving ? (
                            <ActivityIndicator color="#FFF" />
                          ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => { setEditingSessionId(null); setEditCount(''); }}
                        >
                          <Text style={styles.cancelButtonText}>← Back to sessions</Text>
                        </TouchableOpacity>
                      </>
                    ) : editSessions.length === 0 ? (
                      <Text style={[styles.inputHint, { textAlign: 'center', marginVertical: 24 }]}>
                        No sessions found for this player.
                      </Text>
                    ) : (
                      <View style={styles.editSessionList}>
                        {editSessions.map((s) => (
                          <TouchableOpacity
                            key={s.id}
                            style={styles.editSessionRow}
                            onPress={() => { setEditingSessionId(s.id); setEditCount(String(s.touches_logged)); }}
                          >
                            <Text style={styles.editSessionDate}>{s.date}</Text>
                            <Text style={styles.editSessionScore}>{s.touches_logged.toLocaleString()} touches</Text>
                            <Ionicons name="pencil" size={16} color="#1f89ee" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}

                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  accessDeniedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  teamSwitcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switcherOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  switcherSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 4,
  },
  switcherTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  switcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  switcherRowActive: {
    backgroundColor: '#EBF4FF',
  },
  switcherRowText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  switcherRowTextActive: {
    color: '#1f89ee',
  },
  switcherCreateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  switcherCreateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f89ee',
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },

  // Tips Card
  tipsCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  tipDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  tipRow: {
    gap: 3,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  tipBody: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 18,
  },

  removePlayerBtn: {
    paddingLeft: 4,
  },

  // Overview Card
  overviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  overviewItem: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  overviewEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },

  // Top Performer Card
  topPerformerCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFE082',
  },
  topPerformerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  topPerformerEmoji: {
    fontSize: 20,
  },
  topPerformerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    textTransform: 'uppercase',
  },
  topPerformerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topPerformerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  topPerformerInfo: {
    flex: 1,
  },
  topPerformerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  topPerformerStats: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
  },
  topPerformerBadge: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  topPerformerBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
  },

  // Attention Card
  attentionCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  attentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  attentionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
  },
  attentionBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  attentionBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  attentionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B45309',
    marginBottom: 12,
  },
  attentionList: {
    gap: 8,
  },
  attentionPlayer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
  },
  attentionPlayerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  attentionPlayerTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },

  // Player Rankings
  playerList: {
    marginBottom: 20,
  },
  playerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  rankCol: {
    width: 32,
    alignItems: 'center',
  },
  medalEmoji: {
    fontSize: 22,
  },
  rankPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6B7280',
  },
  playerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
    flexShrink: 1,
  },
  streakBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  playerLastActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 1,
  },
  playerRightCol: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  playerWeekTouches: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1f89ee',
  },
  playerWeekLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  challengeCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 2,
  },
  addTouchesHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  addTouchesText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f89ee',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 12,
  },
  emptyStateHint: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB',
    marginTop: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalWrapper: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 12,
    color: '#1a1a2e',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    fontSize: 18,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  inputHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: '#ffb724',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#ffb724',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '700',
  },
  modalTabs: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTabActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modalTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  modalTabTextActive: {
    color: '#1a1a2e',
  },
  editSessionList: {
    gap: 8,
    marginBottom: 8,
  },
  editSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  editSessionDate: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  editSessionScore: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
  },
});
