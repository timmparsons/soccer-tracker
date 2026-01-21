import { useProfile } from '@/hooks/useProfile';
import { useTeamPlayers } from '@/hooks/useTeamPlayers';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CoachDashboard() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const {
    data: teamPlayers,
    isLoading,
    refetch,
  } = useTeamPlayers(profile?.team_id);

  // Modal state
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [juggleCount, setJuggleCount] = useState('');

  // Redirect if not a coach
  if (!profile?.is_coach) {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name='lock-closed' size={48} color='#6B7280' />
        <Text style={styles.accessDeniedText}>Coach Access Only</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size='large' color='#FFA500' />
      </View>
    );
  }

  // Calculate team stats
  const activePlayers =
    teamPlayers?.filter((p) => {
      const lastSession = new Date(p.stats?.last_session_date || 0);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      return lastSession > threeDaysAgo;
    }).length || 0;

  const totalSessions =
    teamPlayers?.reduce((sum, p) => sum + (p.stats?.sessions_count || 0), 0) ||
    0;

  const totalXp =
    teamPlayers?.reduce((sum, p) => sum + (p.total_xp || 0), 0) || 0;

  // Handle opening modal for a player
  const handlePlayerPress = (player: any) => {
    setSelectedPlayer(player);
    setJuggleCount('');
    setModalVisible(true);
  };

  // Handle saving score - using direct Supabase call
  const handleSaveScore = async () => {
    const count = parseInt(juggleCount, 10);

    if (!count || count <= 0 || isNaN(count)) {
      Alert.alert('Invalid Count', 'Please enter a valid juggle count');
      return;
    }

    if (!selectedPlayer) return;

    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const lastIso = selectedPlayer.stats?.last_session_date
        ? selectedPlayer.stats.last_session_date.split('T')[0]
        : null;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayIso = yesterday.toISOString().split('T')[0];

      let newStreak = 1;

      if (lastIso === yesterdayIso)
        newStreak = (selectedPlayer.stats?.streak_days ?? 0) + 1;
      else if (lastIso === todayIso)
        newStreak = selectedPlayer.stats?.streak_days ?? 1;
      else newStreak = 1;

      const newBestStreak = Math.max(
        selectedPlayer.stats?.best_daily_streak ?? 1,
        newStreak
      );

      const currentHighScore = selectedPlayer.stats?.high_score ?? 0;
      const isNewHighScore = count > currentHighScore;

      const updateData: any = {
        last_score: count,
        attempts_count: (selectedPlayer.stats?.attempts_count ?? 0) + 1,
        last_session_duration: 0,
        sessions_count: (selectedPlayer.stats?.sessions_count ?? 0) + 1,
        last_session_date: new Date().toISOString(),
        streak_days: newStreak,
        best_daily_streak: newBestStreak,
      };

      // Only update high score if current count is higher
      if (isNewHighScore) {
        updateData.high_score = count;
      }

      console.log('Updating player:', selectedPlayer.id);
      console.log('Update data:', updateData);

      const { data, error } = await supabase
        .from('juggles')
        .update(updateData)
        .eq('user_id', selectedPlayer.id)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Update successful:', data);

      Alert.alert(
        'Score Added!',
        `${count} juggles recorded for ${
          selectedPlayer.display_name || selectedPlayer.first_name
        }`
      );

      // Refresh the team players list
      await refetch();

      setModalVisible(false);
      setJuggleCount('');
      setSelectedPlayer(null);
    } catch (error) {
      console.error('Error saving score:', error);
      Alert.alert('Error', 'Failed to save score. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name='clipboard' size={32} color='#FFA500' />
          </View>
          <View>
            <Text style={styles.headerTitle}>Coach Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {teamPlayers?.length || 0} players on team
            </Text>
          </View>
        </View>

        {/* Team Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Team Summary</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name='people' size={24} color='#2B9FFF' />
              <Text style={styles.statValue}>{teamPlayers?.length || 0}</Text>
              <Text style={styles.statLabel}>Total Players</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name='flame' size={24} color='#FFA500' />
              <Text style={styles.statValue}>{activePlayers}</Text>
              <Text style={styles.statLabel}>Active (3 days)</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name='fitness' size={24} color='#22c55e' />
              <Text style={styles.statValue}>{totalSessions}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name='trophy' size={24} color='#FFD700' />
              <Text style={styles.statValue}>{totalXp}</Text>
              <Text style={styles.statLabel}>Team XP</Text>
            </View>
          </View>
        </View>

        {/* Player List */}
        <View style={styles.playerList}>
          <Text style={styles.sectionTitle}>Team Roster</Text>
          <Text style={styles.tapHint}>Tap a player to add their score</Text>

          {teamPlayers
            ?.sort((a, b) => {
              const aDate = new Date(a.stats?.last_session_date || 0);
              const bDate = new Date(b.stats?.last_session_date || 0);
              return bDate.getTime() - aDate.getTime();
            })
            .map((player) => {
              const lastSessionDate = player.stats?.last_session_date
                ? new Date(player.stats.last_session_date)
                : null;

              const daysAgo = lastSessionDate
                ? Math.floor(
                    (Date.now() - lastSessionDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : 999;

              const isActive = daysAgo <= 3;
              const isWarning = daysAgo > 3 && daysAgo <= 7;
              const isInactive = daysAgo > 7;

              // Format last active time in local timezone
              let lastActiveText = 'Never';
              if (lastSessionDate) {
                const now = new Date();
                const localLastSession = new Date(lastSessionDate);

                // Get start of today in local time
                const todayStart = new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  now.getDate()
                );

                // Get start of yesterday in local time
                const yesterdayStart = new Date(todayStart);
                yesterdayStart.setDate(yesterdayStart.getDate() - 1);

                if (localLastSession >= todayStart) {
                  lastActiveText = 'Today';
                } else if (localLastSession >= yesterdayStart) {
                  lastActiveText = 'Yesterday';
                } else {
                  const daysDiff = Math.floor(
                    (todayStart.getTime() - localLastSession.getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  if (daysDiff < 7) {
                    lastActiveText = `${daysDiff} days ago`;
                  } else {
                    const weeksDiff = Math.floor(daysDiff / 7);
                    lastActiveText = `${weeksDiff} ${
                      weeksDiff === 1 ? 'week' : 'weeks'
                    } ago`;
                  }
                }
              }

              return (
                <TouchableOpacity
                  key={player.id}
                  style={styles.playerCard}
                  onPress={() => handlePlayerPress(player)}
                  activeOpacity={0.7}
                >
                  <View style={styles.playerHeader}>
                    <Text style={styles.playerName}>
                      {player.display_name || player.first_name || 'Player'}
                    </Text>
                    {isActive && <Text style={styles.activeIcon}>🔥</Text>}
                    {isWarning && <Text style={styles.warningIcon}>⚠️</Text>}
                    {isInactive && <Text style={styles.inactiveIcon}>💤</Text>}
                  </View>

                  <View style={styles.playerStats}>
                    <Text style={styles.playerLevel}>
                      Level {player.level || 1} • {player.total_xp || 0} XP
                    </Text>
                    <Text style={styles.playerSessions}>
                      {player.stats?.sessions_count || 0} sessions
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.lastActive,
                      isActive && styles.lastActiveGood,
                      isWarning && styles.lastActiveWarning,
                      isInactive && styles.lastActiveInactive,
                    ]}
                  >
                    Last active: {lastActiveText}
                  </Text>

                  <View style={styles.addScoreHint}>
                    <Ionicons
                      name='add-circle-outline'
                      size={16}
                      color='#2B9FFF'
                    />
                    <Text style={styles.addScoreHintText}>
                      Tap to add score
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>
      </ScrollView>

      {/* ADD SCORE MODAL */}
      <Modal transparent visible={modalVisible} animationType='slide'>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalOverlay}
            onPress={() => {
              setModalVisible(false);
              setJuggleCount('');
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
                  <Ionicons name='person-add' size={32} color='#2B9FFF' />
                  <Text style={styles.modalTitle}>
                    Add Score for{' '}
                    {selectedPlayer?.display_name || selectedPlayer?.first_name}
                  </Text>
                </View>

                <Text style={styles.modalSubtitle}>
                  Enter the juggle count to record for this player
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Juggle Count</Text>
                  <TextInput
                    style={styles.input}
                    placeholder='Enter juggle count'
                    placeholderTextColor='#9CA3AF'
                    keyboardType='numeric'
                    value={juggleCount}
                    onChangeText={setJuggleCount}
                    autoFocus
                    returnKeyType='done'
                    onSubmitEditing={handleSaveScore}
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveScore}
                >
                  <Text style={styles.saveButtonText}>Save Score</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setModalVisible(false);
                    setJuggleCount('');
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
    marginBottom: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
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

  // Stats Card
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2C3E50',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },

  // Player List
  playerList: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 4,
  },
  tapHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B9FFF',
    marginBottom: 16,
  },
  playerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C3E50',
  },
  activeIcon: {
    fontSize: 20,
  },
  warningIcon: {
    fontSize: 20,
  },
  inactiveIcon: {
    fontSize: 20,
  },
  playerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  playerLevel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B9FFF',
  },
  playerSessions: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  lastActive: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  lastActiveGood: {
    color: '#22c55e',
  },
  lastActiveWarning: {
    color: '#FFA500',
  },
  lastActiveInactive: {
    color: '#EF4444',
  },
  addScoreHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  addScoreHintText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2B9FFF',
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
    fontSize: 22,
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
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    alignSelf: 'center',
  },
  input: {
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#FFA500',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#FFA500',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
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
