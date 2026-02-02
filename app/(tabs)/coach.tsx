import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
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
}

// Helper to get local date
const getLocalDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CoachDashboard() {
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);

  // Modal state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [touchCount, setTouchCount] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    queryFn: async () => {
      // Get all players on the team (excluding coaches)
      const { data: players, error: playersError } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', profile!.team_id)
        .eq('is_coach', false);

      if (playersError) throw playersError;
      if (!players) return [];

      const today = getLocalDate();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weekStart = getLocalDate(sevenDaysAgo);

      // Get stats for each player
      const playersWithStats: PlayerStats[] = await Promise.all(
        players.map(async (player) => {
          // Get all sessions for this player
          const { data: sessions } = await supabase
            .from('daily_sessions')
            .select('touches_logged, duration_minutes, date, created_at')
            .eq('user_id', player.id)
            .order('created_at', { ascending: false });

          // Get player's daily target
          const { data: targetData } = await supabase
            .from('user_targets')
            .select('daily_target_touches')
            .eq('user_id', player.id)
            .single();

          const allSessions = sessions || [];
          const weekSessions = allSessions.filter((s) => s.date >= weekStart);

          // Calculate stats
          const todayTouches = allSessions
            .filter((s) => s.date === today)
            .reduce((sum, s) => sum + s.touches_logged, 0);

          const weekTouches = weekSessions.reduce((sum, s) => sum + s.touches_logged, 0);
          const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
          const weekTpm = weekMinutes > 0 ? Math.round(weekTouches / weekMinutes) : 0;

          const totalTouches = allSessions.reduce((sum, s) => sum + s.touches_logged, 0);

          // Days active this week
          const uniqueWeekDays = new Set(weekSessions.map((s) => s.date)).size;

          // Calculate streak
          const uniqueDates = [...new Set(allSessions.map((s) => s.date))].sort().reverse();
          let streak = 0;
          const checkDate = new Date();

          for (const dateStr of uniqueDates) {
            const sessionDate = new Date(dateStr);
            const diffDays = Math.floor(
              (checkDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (diffDays <= 1) {
              streak++;
              checkDate.setTime(sessionDate.getTime());
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
            daily_target: targetData?.daily_target_touches || 1000,
            week_minutes: weekMinutes,
            week_tpm: weekTpm,
            days_active_this_week: uniqueWeekDays,
          };
        })
      );

      // Sort by week touches (most active first)
      return playersWithStats.sort((a, b) => b.week_touches - a.week_touches);
    },
  });

  // Refetch on focus
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchProfile();
    }, [refetch, refetchProfile])
  );

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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
        <ActivityIndicator size="large" color="#FFA500" />
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
    setModalVisible(true);
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

  // Share team code
  const handleShareCode = async () => {
    if (!team?.code) return;

    try {
      await Share.share({
        message: `Join my team "${team.name}" on Master Touch!\n\nTeam Code: ${team.code}`,
      });
    } catch (error) {
      // Sharing cancelled
    }
  };

  // Copy team code
  const handleCopyCode = async () => {
    if (!team?.code) return;
    await Clipboard.setStringAsync(team.code);
    Alert.alert('Copied!', 'Team code copied to clipboard');
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

  // Get TPM label
  const getTpmLabel = (tpm: number) => {
    if (tpm === 0) return 'No data';
    if (tpm < 30) return 'Slow';
    if (tpm < 50) return 'Moderate';
    if (tpm < 80) return 'Good';
    return 'Game speed';
  };

  // Get TPM color
  const getTpmColor = (tpm: number) => {
    if (tpm === 0) return '#9CA3AF';
    if (tpm < 30) return '#EF4444';
    if (tpm < 50) return '#F59E0B';
    if (tpm < 80) return '#22C55E';
    return '#10B981';
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
            <Ionicons name="clipboard" size={32} color="#FFA500" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{team?.name || 'My Team'}</Text>
            <Text style={styles.headerSubtitle}>
              {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'} • {activePlayers} active
            </Text>
          </View>
        </View>

        {/* Team Code Card */}
        <View style={styles.codeCard}>
          <View style={styles.codeHeader}>
            <Ionicons name="key" size={20} color="#2B9FFF" />
            <Text style={styles.codeLabel}>Team Code</Text>
          </View>
          <Text style={styles.codeText}>{team?.code || '---'}</Text>
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeButton} onPress={handleCopyCode}>
              <Ionicons name="copy-outline" size={18} color="#2B9FFF" />
              <Text style={styles.codeButtonText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.codeButton} onPress={handleShareCode}>
              <Ionicons name="share-outline" size={18} color="#2B9FFF" />
              <Text style={styles.codeButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Team Overview Card */}
        <View style={styles.overviewCard}>
          <Text style={styles.sectionTitle}>Team Overview</Text>

          <View style={styles.overviewGrid}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewEmoji}>📊</Text>
              <Text style={styles.overviewValue}>{teamTodayTouches.toLocaleString()}</Text>
              <Text style={styles.overviewLabel}>Today</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewEmoji}>📈</Text>
              <Text style={styles.overviewValue}>{teamWeekTouches.toLocaleString()}</Text>
              <Text style={styles.overviewLabel}>This Week</Text>
            </View>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewEmoji}>🏆</Text>
              <Text style={styles.overviewValue}>{teamTotalTouches.toLocaleString()}</Text>
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

        {/* Player List */}
        <View style={styles.playerList}>
          <Text style={styles.sectionTitle}>All Players</Text>

          {teamPlayers && teamPlayers.length > 0 ? (
            teamPlayers.map((player) => {
              const isActive = player.last_session_date &&
                new Date(player.last_session_date) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
              const isWarning = player.last_session_date &&
                new Date(player.last_session_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) &&
                !isActive;
              const targetProgress = Math.min((player.today_touches / player.daily_target) * 100, 100);

              return (
                <TouchableOpacity
                  key={player.id}
                  style={styles.playerCard}
                  onPress={() => handlePlayerPress(player)}
                  activeOpacity={0.7}
                >
                  <View style={styles.playerTop}>
                    <Image
                      source={{
                        uri: player.avatar_url ||
                          'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                      }}
                      style={styles.playerAvatar}
                    />
                    <View style={styles.playerInfo}>
                      <View style={styles.playerNameRow}>
                        <Text style={styles.playerName}>
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
                        {player.days_active_this_week > 0 && ` • ${player.days_active_this_week}/7 days`}
                      </Text>
                    </View>
                    <View style={styles.playerStatus}>
                      {isActive && <View style={[styles.statusDot, styles.statusActive]} />}
                      {isWarning && <View style={[styles.statusDot, styles.statusWarning]} />}
                      {!isActive && !isWarning && <View style={[styles.statusDot, styles.statusInactive]} />}
                    </View>
                  </View>

                  {/* Today's Target Progress */}
                  <View style={styles.targetProgressContainer}>
                    <View style={styles.targetProgressHeader}>
                      <Text style={styles.targetProgressLabel}>Today's Target</Text>
                      <Text style={styles.targetProgressValue}>
                        {player.today_touches.toLocaleString()} / {player.daily_target.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.targetProgressBar}>
                      <View
                        style={[
                          styles.targetProgressFill,
                          {
                            width: `${targetProgress}%`,
                            backgroundColor: targetProgress >= 100 ? '#22C55E' : '#2B9FFF',
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.playerStats}>
                    <View style={styles.playerStat}>
                      <Text style={styles.playerStatValue}>{player.week_touches.toLocaleString()}</Text>
                      <Text style={styles.playerStatLabel}>Week</Text>
                    </View>
                    <View style={styles.playerStatDivider} />
                    <View style={styles.playerStat}>
                      <Text style={styles.playerStatValue}>{player.total_touches.toLocaleString()}</Text>
                      <Text style={styles.playerStatLabel}>Total</Text>
                    </View>
                    <View style={styles.playerStatDivider} />
                    <View style={styles.playerStat}>
                      <Text style={[styles.playerStatValue, { color: getTpmColor(player.week_tpm) }]}>
                        {player.week_tpm > 0 ? player.week_tpm : '-'}
                      </Text>
                      <Text style={styles.playerStatLabel}>Tempo</Text>
                    </View>
                    <View style={styles.playerStatDivider} />
                    <View style={styles.playerStat}>
                      <Text style={styles.playerStatValue}>{player.total_sessions}</Text>
                      <Text style={styles.playerStatLabel}>Sessions</Text>
                    </View>
                  </View>

                  <View style={styles.addTouchesHint}>
                    <Ionicons name="add-circle-outline" size={16} color="#2B9FFF" />
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
                Share your team code to invite players
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ADD TOUCHES MODAL */}
      <Modal transparent visible={modalVisible} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalOverlay}
            onPress={() => {
              setModalVisible(false);
              setTouchCount('');
              setDurationMinutes('');
              setSelectedPlayer(null);
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalWrapper}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Ionicons name="football" size={32} color="#2B9FFF" />
                  <Text style={styles.modalTitle}>
                    Log Touches for {selectedPlayer?.display_name || selectedPlayer?.name}
                  </Text>
                </View>

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

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setModalVisible(false);
                    setTouchCount('');
                    setDurationMinutes('');
                    setSelectedPlayer(null);
                  }}
                >
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
    gap: 16,
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
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },

  // Code Card
  codeCard: {
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
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 16,
  },
  codeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  codeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B9FFF',
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

  // Player List
  playerList: {
    marginBottom: 20,
  },
  playerCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  playerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  playerInfo: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  streakBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  playerLastActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 2,
  },
  playerStatus: {
    paddingLeft: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#22C55E',
  },
  statusWarning: {
    backgroundColor: '#FFA500',
  },
  statusInactive: {
    backgroundColor: '#D1D5DB',
  },

  // Target Progress
  targetProgressContainer: {
    marginBottom: 16,
  },
  targetProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetProgressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  targetProgressValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  targetProgressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  targetProgressFill: {
    height: '100%',
    borderRadius: 4,
  },

  playerStats: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  playerStat: {
    flex: 1,
    alignItems: 'center',
  },
  playerStatValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2B9FFF',
    marginBottom: 2,
  },
  playerStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  playerStatDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  addTouchesHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addTouchesText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B9FFF',
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
    backgroundColor: '#FFA500',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FFA500',
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
});
