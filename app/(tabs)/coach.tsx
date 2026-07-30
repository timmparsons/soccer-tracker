import RosterCard from '@/components/CoachDashboard/RosterCard';
import InactivePlayersModal from '@/components/common/InactivePlayersModal';
import NotificationBell from '@/components/common/NotificationBell';
import CoachChallengeModal from '@/components/modals/CoachChallengeModal';
import CoachNoteModal from '@/components/modals/CoachNoteModal';
import { useCoachChallenges } from '@/hooks/useCoachChallenges';
import { useAwardCoachPick, useCoachPickForDate, useRemoveCoachPick } from '@/hooks/useCoachPicks';
import { PlayerStats, useCoachTeamPlayers } from '@/hooks/useCoachTeamPlayers';
import { useCoachTeams } from '@/hooks/useCoachTeams';
import { useCoachingTips } from '@/hooks/useCoachingTips';
import { useCheersForItems, useMyReactions } from '@/hooks/useFeedCheers';
import { useInactivePlayers } from '@/hooks/useInactivePlayers';
import { useNudgePlayer } from '@/hooks/useNudgePlayer';
import { useProfile } from '@/hooks/useProfile';
import { useTeamDailySessions } from '@/hooks/useTeamDailySessions';
import { useUser } from '@/hooks/useUser';
import { buildCoachCheerKey } from '@/lib/coachCheerKey';
import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CoachDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const { data: coachTeams = [], refetch: refetchCoachTeams } = useCoachTeams(user?.id);

  // Team switcher state
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [switchingTeam, setSwitchingTeam] = useState(false);
  const [inactiveModalVisible, setInactiveModalVisible] = useState(false);
  const { data: nudgeModalPlayers = [] } = useInactivePlayers(profile?.team_id);

  // Modal state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTab, setModalTab] = useState<'log' | 'edit'>('log');
  const [touchCount, setTouchCount] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tipsExpanded, setTipsExpanded] = useState(false);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [cellInfo, setCellInfo] = useState<{ player: PlayerStats; date: string } | null>(null);
  const [challengeModalVisible, setChallengeModalVisible] = useState(false);
  const [notePlayer, setNotePlayer] = useState<PlayerStats | null>(null);

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
  } = useCoachTeamPlayers(profile?.team_id);

  // Stable player IDs for the week-grid session query
  const playerIds = useMemo(() => teamPlayers?.map((p) => p.id) ?? [], [teamPlayers]);
  const { sessionMap, weekDates } = useTeamDailySessions(profile?.team_id, playerIds);

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

  // Coach challenges — must be before early returns
  const { data: coachChallenges = [] } = useCoachChallenges(user?.id);

  // Sort players: consistency first (days active), then volume
  // Must be before early returns — rules of hooks
  const sortedPlayers = useMemo(
    () =>
      [...(teamPlayers ?? [])].sort(
        (a, b) =>
          b.days_active_this_week - a.days_active_this_week ||
          b.week_touches - a.week_touches,
      ),
    [teamPlayers],
  );

  // Coach engagement tools — cheer, coach's choice, nudge, note
  const today = getLocalDate();
  const cheerKeys = useMemo(
    () => sortedPlayers.map((p) => buildCoachCheerKey(p.id, today)),
    [sortedPlayers, today],
  );
  const { data: cheersByKey = new Map() } = useCheersForItems(cheerKeys);
  const { data: myReactionsByKey = new Map() } = useMyReactions(user?.id);
  const { data: coachPick } = useCoachPickForDate(profile?.team_id, today);
  const { mutate: awardCoachPick } = useAwardCoachPick();
  const { mutate: removeCoachPick } = useRemoveCoachPick();
  const { mutate: nudgePlayer, isPending: nudgePending } = useNudgePlayer();

  const handleTogglePick = (player: PlayerStats) => {
    if (!profile?.team_id || !user?.id) return;
    if (coachPick?.player_id === player.id) {
      removeCoachPick({ teamId: profile.team_id, date: today });
    } else {
      awardCoachPick({
        teamId: profile.team_id,
        coachId: user.id,
        playerId: player.id,
        date: today,
        playerPushToken: player.expo_push_token,
      });
    }
  };

  const handleNudge = (player: PlayerStats) => {
    if (!profile?.team_id) return;
    nudgePlayer(
      { playerId: player.id, teamId: profile.team_id, playerPushToken: player.expo_push_token },
      {
        onError: () => {
          Alert.alert('Could not send nudge', 'Please try again.');
        },
      },
    );
  };

  const handleNudgeAll = (players: PlayerStats[]) => {
    if (!profile?.team_id) return;
    const teamId = profile.team_id;
    Alert.alert(
      'Nudge All Inactive Players',
      `Send a reminder push to ${players.length} inactive player${players.length === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Nudge All',
          onPress: () => {
            players.forEach((player) => {
              nudgePlayer(
                { playerId: player.id, teamId, playerPushToken: player.expo_push_token },
                {
                  onError: () => {
                    Alert.alert('Could not send nudge', `Failed to nudge ${player.display_name || player.name}.`);
                  },
                },
              );
            });
          },
        },
      ],
    );
  };

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

  if (!profile?.team_id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noTeamState}>
          <Ionicons name="people-outline" size={56} color="#D1D5DB" />
          <Text style={styles.noTeamTitle}>No team yet</Text>
          <Text style={styles.noTeamSubtitle}>
            Create your first team to start tracking your players.
          </Text>
          <TouchableOpacity
            style={styles.noTeamButton}
            onPress={() => router.push('/(modals)/create-team')}
            activeOpacity={0.8}
          >
            <Text style={styles.noTeamButtonText}>Create Team</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate comprehensive team stats
  const totalPlayers = teamPlayers?.length || 0;
  const activePlayers = teamPlayers?.filter((p) => p.today_touches > 0).length || 0;

  const inactivePlayers = teamPlayers?.filter((p) => {
    if (!p.last_session_date) return true;
    const lastSession = new Date(p.last_session_date);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return lastSession < sevenDaysAgo;
  }) || [];

  // Roster grouping: active-today players surface first, 0-touch players are
  // visually separated/muted below so the coach's eye lands on who trained.
  const activeTodayPlayers = sortedPlayers.filter((p) => p.today_touches > 0);
  const inactiveTodayPlayers = sortedPlayers.filter((p) => p.today_touches === 0);

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

  const renderPlayerCard = (player: PlayerStats) => {
    const activeChallenge = coachChallenges.find(
      (c) => c.player_id === player.id && c.status === 'active',
    );
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCompleted = coachChallenges.find(
      (c) =>
        c.player_id === player.id &&
        c.status === 'completed' &&
        c.completed_at &&
        new Date(c.completed_at).getTime() > sevenDaysAgo,
    );
    const feedItemKey = buildCoachCheerKey(player.id, today);
    return (
      <RosterCard
        key={player.id}
        player={player}
        weekDates={weekDates}
        sessionMap={sessionMap}
        isExpanded={expandedPlayerId === player.id}
        onToggleExpand={() =>
          setExpandedPlayerId(expandedPlayerId === player.id ? null : player.id)
        }
        onCellPress={(date) => setCellInfo({ player, date })}
        onLogPress={() => handlePlayerPress(player)}
        onEditPress={() => handleEditPress(player)}
        onChallengePress={() => {
          if (activeChallenge) {
            Alert.alert(
              'Active Challenge',
              `${player.display_name || player.name} already has an active challenge. Wait for them to complete it first.`,
            );
            return;
          }
          setExpandedPlayerId(null);
          setSelectedPlayer(player);
          setChallengeModalVisible(true);
        }}
        onRemovePress={() => handleRemovePlayer(player)}
        activeChallenge={activeChallenge}
        recentCompleted={recentCompleted}
        feedItemKey={feedItemKey}
        coachId={user?.id ?? ''}
        cheerData={cheersByKey.get(feedItemKey)}
        myReaction={myReactionsByKey.get(feedItemKey)}
        isPicked={coachPick?.player_id === player.id}
        onTogglePick={() => handleTogglePick(player)}
        onNudge={() => handleNudge(player)}
        onOpenNote={() => setNotePlayer(player)}
        isInactiveToday={player.today_touches === 0}
      />
    );
  };

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

  const handleEditPress = (player: PlayerStats) => {
    setSelectedPlayer(player);
    setTouchCount('');
    setDurationMinutes('');
    setEditSessions([]);
    setEditingSessionId(null);
    setEditCount('');
    setModalVisible(true);
    // Load edit sessions immediately
    handleSwitchToEdit(player.id);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          {coachTeams.length > 1 ? (
            <TouchableOpacity
              style={styles.teamSwitcherPill}
              onPress={() => setSwitcherVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.headerTitle} numberOfLines={1}>
                {team?.name || 'My Team'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#ffb724" />
            </TouchableOpacity>
          ) : (
            <Text style={styles.headerTitle}>{team?.name || 'My Team'}</Text>
          )}
          <Text style={styles.headerSubtitle}>
            {activePlayers}/{totalPlayers} active today
            {playersHitTarget > 0 ? ` · ${playersHitTarget} hit target` : ''}
            {teamAvgTpm > 0 ? ` · ${teamAvgTpm}/min` : ''}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <NotificationBell
            hasNewCheers={nudgeModalPlayers.length > 0}
            onNotificationPress={() => setInactiveModalVisible(true)}
          />
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
            <View style={styles.headerAvatarGlow} />
            <Image
              source={{ uri: profile?.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
              style={styles.headerAvatar}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Global nudge action — targets everyone with 0 touches today */}
        {inactiveTodayPlayers.length > 0 && (
          <TouchableOpacity
            style={[styles.nudgeAllHeaderBtn, nudgePending && styles.nudgeAllHeaderBtnDisabled]}
            onPress={() => handleNudgeAll(inactiveTodayPlayers)}
            disabled={nudgePending}
            activeOpacity={0.85}
          >
            <Ionicons name="notifications" size={16} color="#FFF" />
            <Text style={styles.nudgeAllHeaderBtnText}>
              Nudge All Inactive ({inactiveTodayPlayers.length})
            </Text>
          </TouchableOpacity>
        )}

        {/* Roster */}
        <View style={styles.playerList}>
          {sortedPlayers.length > 0 ? (
            <>
              {activeTodayPlayers.map(renderPlayerCard)}
              {inactiveTodayPlayers.length > 0 && (
                <View style={styles.inactiveDivider}>
                  <View style={styles.inactiveDividerLine} />
                  <Text style={styles.inactiveDividerText}>
                    Not Trained Today ({inactiveTodayPlayers.length})
                  </Text>
                  <View style={styles.inactiveDividerLine} />
                </View>
              )}
              {inactiveTodayPlayers.map(renderPlayerCard)}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>No players yet</Text>
              <Text style={styles.emptyStateHint}>Add players from your Profile page</Text>
            </View>
          )}
        </View>

        {/* Needs attention */}
        {inactivePlayers.length > 0 && (
          <View style={styles.attentionCard}>
            <View style={styles.attentionHeader}>
              <Ionicons name="alert-circle" size={18} color="#F59E0B" />
              <Text style={styles.attentionTitle}>Needs Attention</Text>
              <View style={styles.attentionBadge}>
                <Text style={styles.attentionBadgeText}>{inactivePlayers.length}</Text>
              </View>
              <TouchableOpacity
                style={[styles.nudgeAllBtn, nudgePending && styles.nudgeAllBtnDisabled]}
                onPress={() => handleNudgeAll(inactivePlayers)}
                disabled={nudgePending}
              >
                <Ionicons name="notifications-outline" size={13} color="#92400E" />
                <Text style={styles.nudgeAllBtnText}>Nudge All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.attentionList}>
              {inactivePlayers.map((player) => (
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

        {/* AI tips (collapsible) */}
        {(tips.length > 0 || tipsFetching) && (
          <View style={styles.tipsCard}>
            <TouchableOpacity
              style={styles.tipsHeader}
              onPress={() => setTipsExpanded((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.tipsTitle}>Training Tips</Text>
              <View style={styles.tipsHeaderRight}>
                <TouchableOpacity
                  onPress={() =>
                    queryClient.invalidateQueries({
                      queryKey: ['coaching-tips', profile?.team_id],
                    })
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="refresh-outline" size={16} color="#1f89ee" />
                </TouchableOpacity>
                <Ionicons
                  name={tipsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#78909C"
                />
              </View>
            </TouchableOpacity>
            {tipsExpanded && (
              tipsFetching && tips.length === 0 ? (
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
              )
            )}
          </View>
        )}

      </ScrollView>

      {/* TEAM SWITCHER MODAL */}
      {coachTeams.length > 1 && (
        <Modal transparent visible={switcherVisible} animationType="fade" onRequestClose={() => setSwitcherVisible(false)}>
          <TouchableOpacity style={styles.switcherOverlay} activeOpacity={1} onPress={() => setSwitcherVisible(false)}>
            <View style={[styles.switcherSheet, { paddingBottom: Math.max(36, insets.bottom + 20) }]}>
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

      {/* COACH CHALLENGE MODAL */}
      {profile?.team_id && user?.id && (
        <CoachChallengeModal
          visible={challengeModalVisible}
          onClose={() => setChallengeModalVisible(false)}
          coachId={user.id}
          teamId={profile.team_id}
          preselectedPlayer={selectedPlayer ? {
            id: selectedPlayer.id,
            name: selectedPlayer.display_name || selectedPlayer.name,
          } : undefined}
        />
      )}

      {/* COACH NOTE MODAL */}
      {notePlayer && (
        <CoachNoteModal
          visible={!!notePlayer}
          onClose={() => setNotePlayer(null)}
          playerId={notePlayer.id}
          playerName={notePlayer.display_name || notePlayer.name}
          playerPushToken={notePlayer.expo_push_token}
        />
      )}

      {/* CELL INFO SHEET */}
      {cellInfo && (() => {
        const { player, date } = cellInfo;
        const touches = sessionMap[player.id]?.[date]?.touches ?? 0;
        const hitTarget = touches >= player.daily_target;
        const dateObj = new Date(date + 'T00:00:00');
        const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        return (
          <Modal transparent visible animationType="slide" onRequestClose={() => setCellInfo(null)}>
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setCellInfo(null)} />
              <View style={[styles.cellInfoSheet, { paddingBottom: Math.max(40, insets.bottom + 24) }]}>
                <View style={styles.cellInfoHeader}>
                  <Image
                    source={{ uri: player.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                    style={styles.cellInfoAvatar}
                  />
                  <View>
                    <Text style={styles.cellInfoName}>{player.display_name || player.name}</Text>
                    <Text style={styles.cellInfoDate}>{dateLabel}</Text>
                  </View>
                </View>
                <View style={styles.cellInfoStats}>
                  <View style={styles.cellInfoStat}>
                    <Text style={styles.cellInfoStatValue}>{touches.toLocaleString()}</Text>
                    <Text style={styles.cellInfoStatLabel}>Touches</Text>
                  </View>
                  <View style={styles.cellInfoStat}>
                    <Text style={styles.cellInfoStatValue}>{player.daily_target.toLocaleString()}</Text>
                    <Text style={styles.cellInfoStatLabel}>Target</Text>
                  </View>
                  <View style={styles.cellInfoStat}>
                    <Text style={[styles.cellInfoStatValue, { color: hitTarget ? '#31af4d' : '#EF4444' }]}>
                      {hitTarget ? '✓' : '✗'}
                    </Text>
                    <Text style={styles.cellInfoStatLabel}>{hitTarget ? 'Hit target' : 'Missed'}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.cellInfoEditBtn}
                  onPress={() => { setCellInfo(null); handleEditPress(player); }}
                >
                  <Text style={styles.cellInfoEditText}>Edit Session</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        );
      })()}

      {/* ADD TOUCHES MODAL */}
      <Modal transparent visible={modalVisible} animationType="slide" onRequestClose={closeModal} statusBarTranslucent={Platform.OS === 'android'}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeModal} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
              <View style={[styles.modalContent, { paddingBottom: Math.max(40, insets.bottom + 24) }]}>
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
                      Log
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalTab, modalTab === 'edit' && styles.modalTabActive]}
                    onPress={() => selectedPlayer && handleSwitchToEdit(selectedPlayer.id)}
                  >
                    <Text style={[styles.modalTabText, modalTab === 'edit' && styles.modalTabTextActive]}>
                      Edit
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
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <InactivePlayersModal
        visible={inactiveModalVisible}
        onClose={() => setInactiveModalVisible(false)}
        players={nudgeModalPlayers}
      />
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
  noTeamState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  noTeamTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
    marginTop: 4,
  },
  noTeamSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 22,
  },
  noTeamButton: {
    marginTop: 8,
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  noTeamButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFF',
    marginBottom: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#1f89ee',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
  },
  tabTextActive: {
    color: '#1f89ee',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: '#F5F7FA',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  headerAvatarGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 32,
    backgroundColor: '#1f89ee',
    opacity: 0.25,
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
  },
  tipsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#78909C',
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
  nudgeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  nudgeAllBtnDisabled: {
    opacity: 0.5,
  },
  nudgeAllBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
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
  nudgeAllHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 16,
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  nudgeAllHeaderBtnDisabled: {
    opacity: 0.6,
  },
  nudgeAllHeaderBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  inactiveDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  inactiveDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  inactiveDividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 40,
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

  // Cell info sheet
  cellInfoSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  cellInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  cellInfoAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  cellInfoName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  cellInfoDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
  cellInfoStats: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  cellInfoStat: {
    flex: 1,
    alignItems: 'center',
  },
  cellInfoStatValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  cellInfoStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78909C',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  cellInfoEditBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cellInfoEditText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
});
