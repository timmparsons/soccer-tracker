import { fetchTouchesLeaderboard, type TeamMemberStats } from '@/hooks/useLeaderboard';
import { useAllTeams, type AdminTeam } from '@/hooks/useAllTeams';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminDashboard() {
  const router = useRouter();
  const [selectedTeam, setSelectedTeam] = useState<AdminTeam | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<TeamMemberStats[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const { data: teams = [], isLoading, refetch } = useAllTeams(true);

  const handleSelectTeam = async (team: AdminTeam) => {
    setSelectedTeam(team);
    setLoadingPlayers(true);
    try {
      const players = await fetchTouchesLeaderboard(team.id);
      setTeamPlayers(players);
    } catch {
      setTeamPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied', `Join code "${code}" copied to clipboard.`);
  };

  if (selectedTeam) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedTeam(null)}>
            <Ionicons name='chevron-back' size={22} color='#1a1a2e' />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{selectedTeam.name}</Text>
            <Text style={styles.headerSub}>{selectedTeam.coach_name} · Season {selectedTeam.season_number}</Text>
          </View>
          <TouchableOpacity style={styles.codeChip} onPress={() => handleCopyCode(selectedTeam.code)}>
            <Text style={styles.codeChipText}>{selectedTeam.code}</Text>
            <Ionicons name='copy-outline' size={13} color='#1f89ee' />
          </TouchableOpacity>
        </View>

        {loadingPlayers ? (
          <View style={styles.center}>
            <ActivityIndicator size='large' color='#1f89ee' />
          </View>
        ) : teamPlayers.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No players yet</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            {teamPlayers.map((player, i) => (
              <View key={player.id} style={styles.playerRow}>
                <Text style={styles.playerRank}>{i + 1}</Text>
                <Image
                  source={{ uri: player.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                  style={styles.playerAvatar}
                />
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerSub}>{player.today_touches.toLocaleString()} today</Text>
                </View>
                <View style={styles.playerStats}>
                  <Text style={styles.playerWeekly}>{player.weekly_touches.toLocaleString()}</Text>
                  <Text style={styles.playerStatLabel}>this week</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <Ionicons name='close' size={22} color='#1a1a2e' />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Admin</Text>
          <Text style={styles.headerSub}>{teams.length} teams</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size='large' color='#1f89ee' />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        >
          {teams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={styles.teamCard}
              onPress={() => handleSelectTeam(team)}
              activeOpacity={0.75}
            >
              <View style={styles.teamCardTop}>
                <View style={styles.teamCardLeft}>
                  <Text style={styles.teamName}>{team.name}</Text>
                  <Text style={styles.teamCoach}>{team.coach_name} · Season {team.season_number}</Text>
                </View>
                <Ionicons name='chevron-forward' size={18} color='#B0BEC5' />
              </View>

              <View style={styles.teamCardStats}>
                <View style={styles.teamStat}>
                  <Text style={styles.teamStatValue}>{team.player_count}</Text>
                  <Text style={styles.teamStatLabel}>players</Text>
                </View>
                <View style={styles.teamStatDivider} />
                <View style={styles.teamStat}>
                  <Text style={styles.teamStatValue}>{team.weekly_touches.toLocaleString()}</Text>
                  <Text style={styles.teamStatLabel}>touches this week</Text>
                </View>
                <View style={styles.teamStatDivider} />
                <TouchableOpacity
                  style={styles.teamCode}
                  onPress={() => handleCopyCode(team.code)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.teamCodeText}>{team.code}</Text>
                  <Ionicons name='copy-outline' size={12} color='#1f89ee' />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}

          {teams.length === 0 && !isLoading && (
            <View style={styles.center}>
              <Text style={styles.emptyText}>No teams found.{'\n'}Check your Supabase RLS policies.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 1,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF7FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  codeChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1f89ee',
    letterSpacing: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 22,
  },

  // TEAM CARDS
  teamCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  teamCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamCardLeft: {
    flex: 1,
  },
  teamName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  teamCoach: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
  },
  teamCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  teamStat: {
    alignItems: 'center',
  },
  teamStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1f89ee',
  },
  teamStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 1,
  },
  teamStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#F0F0F0',
  },
  teamCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    backgroundColor: '#EFF7FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  teamCodeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1f89ee',
    letterSpacing: 1,
  },

  // PLAYER ROWS
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  playerRank: {
    width: 24,
    fontSize: 15,
    fontWeight: '800',
    color: '#78909C',
    textAlign: 'center',
  },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  playerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
  playerStats: {
    alignItems: 'flex-end',
  },
  playerWeekly: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1f89ee',
  },
  playerStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
