import { useProfile } from '@/hooks/useProfile';
import { useTeamPlayers } from '@/hooks/useTeamPlayers';
import { useUser } from '@/hooks/useUser';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CoachDashboard() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const { data: teamPlayers, isLoading } = useTeamPlayers(profile?.team_id);

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

              return (
                <TouchableOpacity
                  key={player.id}
                  style={styles.playerCard}
                  onPress={() => router.push(`/profile`)} // Could navigate to player detail
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
                    Last active:{' '}
                    {daysAgo === 0
                      ? 'Today'
                      : daysAgo === 1
                      ? 'Yesterday'
                      : daysAgo < 7
                      ? `${daysAgo} days ago`
                      : daysAgo < 999
                      ? `${Math.floor(daysAgo / 7)} weeks ago`
                      : 'Never'}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </View>
      </ScrollView>
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
});
