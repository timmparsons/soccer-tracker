import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
}

export default function CoachDashboard() {
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);

  // Modal state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [touchCount, setTouchCount] = useState('');
  const [saving, setSaving] = useState(false);

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

  // Get team players with their touch stats
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

      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weekStart = sevenDaysAgo.toISOString().split('T')[0];

      // Get stats for each player
      const playersWithStats: PlayerStats[] = await Promise.all(
        players.map(async (player) => {
          // Get all sessions for this player
          const { data: sessions } = await supabase
            .from('daily_sessions')
            .select('touches_logged, date, created_at')
            .eq('user_id', player.id)
            .order('created_at', { ascending: false });

          const allSessions = sessions || [];

          // Calculate stats
          const todayTouches = allSessions
            .filter((s) => s.date === today)
            .reduce((sum, s) => sum + s.touches_logged, 0);

          const weekTouches = allSessions
            .filter((s) => s.date >= weekStart)
            .reduce((sum, s) => sum + s.touches_logged, 0);

          const totalTouches = allSessions.reduce(
            (sum, s) => sum + s.touches_logged,
            0
          );

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
          };
        })
      );

      // Sort by week touches (most active first)
      return playersWithStats.sort((a, b) => b.week_touches - a.week_touches);
    },
  });

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

  // Calculate team stats
  const totalPlayers = teamPlayers?.length || 0;
  const activePlayers = teamPlayers?.filter((p) => {
    if (!p.last_session_date) return false;
    const lastSession = new Date(p.last_session_date);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return lastSession > threeDaysAgo;
  }).length || 0;

  const teamTodayTouches = teamPlayers?.reduce((sum, p) => sum + p.today_touches, 0) || 0;
  const teamWeekTouches = teamPlayers?.reduce((sum, p) => sum + p.week_touches, 0) || 0;

  // Handle opening modal for a player
  const handlePlayerPress = (player: PlayerStats) => {
    setSelectedPlayer(player);
    setTouchCount('');
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
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase.from('daily_sessions').insert({
        user_id: selectedPlayer.id,
        touches_logged: count,
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
      setSelectedPlayer(null);
    } catch (error) {
      console.error('Error saving touches:', error);
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
      console.error('Error sharing:', error);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="clipboard" size={32} color="#FFA500" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{team?.name || 'My Team'}</Text>
            <Text style={styles.headerSubtitle}>
              {totalPlayers} {totalPlayers === 1 ? 'player' : 'players'}
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

        {/* Team Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Team Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{teamTodayTouches.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{teamWeekTouches.toLocaleString()}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{activePlayers}/{totalPlayers}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>
        </View>

        {/* Player List */}
        <View style={styles.playerList}>
          <Text style={styles.sectionTitle}>Players</Text>

          {teamPlayers && teamPlayers.length > 0 ? (
            teamPlayers.map((player) => {
              const isActive = player.last_session_date &&
                new Date(player.last_session_date) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
              const isWarning = player.last_session_date &&
                new Date(player.last_session_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) &&
                !isActive;

              return (
                <TouchableOpacity
                  key={player.id}
                  style={styles.playerCard}
                  onPress={() => handlePlayerPress(player)}
                  activeOpacity={0.7}
                >
                  <View style={styles.playerTop}>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>
                        {player.display_name || player.name || 'Player'}
                      </Text>
                      <Text style={styles.playerLastActive}>
                        {formatLastActive(player.last_session_date)}
                        {player.current_streak > 0 && ` • ${player.current_streak} day streak`}
                      </Text>
                    </View>
                    <View style={styles.playerStatus}>
                      {isActive && <View style={[styles.statusDot, styles.statusActive]} />}
                      {isWarning && <View style={[styles.statusDot, styles.statusWarning]} />}
                      {!isActive && !isWarning && <View style={[styles.statusDot, styles.statusInactive]} />}
                    </View>
                  </View>

                  <View style={styles.playerStats}>
                    <View style={styles.playerStat}>
                      <Text style={styles.playerStatValue}>{player.today_touches.toLocaleString()}</Text>
                      <Text style={styles.playerStatLabel}>Today</Text>
                    </View>
                    <View style={styles.playerStatDivider} />
                    <View style={styles.playerStat}>
                      <Text style={styles.playerStatValue}>{player.week_touches.toLocaleString()}</Text>
                      <Text style={styles.playerStatLabel}>Week</Text>
                    </View>
                    <View style={styles.playerStatDivider} />
                    <View style={styles.playerStat}>
                      <Text style={styles.playerStatValue}>{player.total_touches.toLocaleString()}</Text>
                      <Text style={styles.playerStatLabel}>Total</Text>
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

                <Text style={styles.modalSubtitle}>
                  Enter the number of touches to add for this player
                </Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter touch count"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    value={touchCount}
                    onChangeText={setTouchCount}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleSaveTouches}
                  />
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
    backgroundColor: '#F5F9FF',
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
    color: '#2C3E50',
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
    color: '#2C3E50',
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

  // Stats Card
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F5F9FF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },

  // Player List
  playerList: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 16,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 4,
  },
  playerLastActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
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
  playerStats: {
    flexDirection: 'row',
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  playerStat: {
    flex: 1,
    alignItems: 'center',
  },
  playerStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2B9FFF',
    marginBottom: 2,
  },
  playerStatLabel: {
    fontSize: 11,
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
    backgroundColor: 'rgba(44, 62, 80, 0.6)',
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
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 12,
    color: '#2C3E50',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#6B7280',
    marginBottom: 24,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F5F9FF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    fontSize: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    fontWeight: '800',
    color: '#2C3E50',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#FFA500',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
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
