import { useCoachTeamPlayerCounts } from '@/hooks/useCoachTeamPlayerCounts';
import { useCoachTeams, type CoachTeam } from '@/hooks/useCoachTeams';
import { useStartNewSeason } from '@/hooks/useSeasons';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ManageTabProps {
  activeTeamId: string | undefined;
  onTeamSwitch: (teamId: string) => void;
}

interface TeamPlayer {
  id: string;
  name: string;
  display_name: string;
  avatar_url: string | null;
}

// ─── TeamCardItem ────────────────────────────────────────────────────────────

interface TeamCardItemProps {
  team: CoachTeam;
  playerCount: number;
  isActive: boolean;
  userId: string;
  onSwitchToActive: () => void;
  onArchived: () => void;
}

function TeamCardItem({
  team,
  playerCount,
  isActive,
  userId,
  onSwitchToActive,
  onArchived,
}: TeamCardItemProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { mutateAsync: startNewSeason, isPending: startingNewSeason } = useStartNewSeason();

  const [expanded, setExpanded] = useState(false);
  const [addPlayerVisible, setAddPlayerVisible] = useState(false);
  const [addPlayerName, setAddPlayerName] = useState('');
  const [addPlayerEmail, setAddPlayerEmail] = useState('');
  const [addPlayerPassword, setAddPlayerPassword] = useState('');
  const [addPlayerSaving, setAddPlayerSaving] = useState(false);

  const { data: players = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['manage-team-players', team.id],
    enabled: expanded,
    queryFn: async (): Promise<TeamPlayer[]> => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', team.id)
        .eq('is_coach', false)
        .order('name');
      return (data ?? []) as TeamPlayer[];
    },
  });

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(team.code);
    Alert.alert('Copied!', 'Team code copied to clipboard.');
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join my team "${team.name}" on Master Touch!\n\nTeam Code: ${team.code}`,
      });
    } catch {
      // user cancelled
    }
  };

  const handleRemovePlayer = (player: TeamPlayer) => {
    Alert.alert(
      'Remove Player',
      `Remove ${player.display_name || player.name} from the team? They can rejoin with the team code.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('profiles')
              .update({ team_id: null })
              .eq('id', player.id);
            if (error) {
              Alert.alert('Error', 'Failed to remove player.');
              return;
            }
            queryClient.invalidateQueries({ queryKey: ['manage-team-players', team.id] });
            queryClient.invalidateQueries({ queryKey: ['coach-team-player-counts'] });
            queryClient.invalidateQueries({ queryKey: ['coach-team-players', team.id] });
          },
        },
      ],
    );
  };

  const handleNewSeason = () => {
    Alert.alert(
      'Start New Season?',
      'This will reset the team leaderboard and generate a new join code. Players keep all personal stats and stay on the team automatically.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Season',
          style: 'destructive',
          onPress: async () => {
            try {
              await startNewSeason({
                teamId: team.id,
                currentSeasonNumber: team.season_number ?? 1,
                currentSeasonStartDate: team.season_start_date ?? team.created_at,
                finalTeamXp: 0,
                finalTeamLevel: 1,
                playerStandings: [],
              });
              queryClient.invalidateQueries({ queryKey: ['coach-teams'] });
              Alert.alert('New Season Started!', 'Share the new team code with any new players who need to join.');
            } catch {
              Alert.alert('Error', 'Failed to start new season. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleArchiveTeam = () => {
    Alert.alert(
      'Archive Team',
      `Archive "${team.name}"? This will remove all players and cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('profiles').update({ team_id: null }).eq('team_id', team.id);
              const { error } = await supabase.from('teams').delete().eq('id', team.id);
              if (error) throw error;
              queryClient.invalidateQueries({ queryKey: ['coach-teams'] });
              queryClient.invalidateQueries({ queryKey: ['coach-team-player-counts'] });
              onArchived();
            } catch {
              Alert.alert('Error', 'Failed to archive team. Please try again.');
            }
          },
        },
      ],
    );
  };

  const handleAddPlayer = async () => {
    if (!addPlayerName.trim() || !addPlayerEmail.trim() || !addPlayerPassword.trim()) {
      Alert.alert('Required', 'Please fill in all fields.');
      return;
    }
    setAddPlayerSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-managed-player`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session!.access_token}`,
          },
          body: JSON.stringify({
            name: addPlayerName.trim(),
            email: addPlayerEmail.trim(),
            password: addPlayerPassword,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        if (json.error === 'email_taken') throw new Error('That email is already registered.');
        throw new Error('Failed to add player. Please try again.');
      }
      Alert.alert('Player Added!', `${addPlayerName.trim()} is now on your team.`);
      setAddPlayerVisible(false);
      setAddPlayerName('');
      setAddPlayerEmail('');
      setAddPlayerPassword('');
      queryClient.invalidateQueries({ queryKey: ['manage-team-players', team.id] });
      queryClient.invalidateQueries({ queryKey: ['coach-team-player-counts'] });
      queryClient.invalidateQueries({ queryKey: ['coach-team-players', team.id] });
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setAddPlayerSaving(false);
    }
  };

  return (
    <>
      <View style={[styles.teamCard, isActive && styles.teamCardActive]}>
        {/* Card header row */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
            <View style={styles.cardMeta}>
              <View style={styles.seasonBadge}>
                <Text style={styles.seasonBadgeText}>Season {team.season_number ?? 1}</Text>
              </View>
              <Text style={styles.playerCountText}>
                {playerCount} {playerCount === 1 ? 'player' : 'players'}
              </Text>
            </View>
          </View>
          <View>
            {isActive ? (
              <View style={styles.activeBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#31af4d" />
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.setActiveBtn} onPress={onSwitchToActive}>
                <Text style={styles.setActiveBtnText}>Set Active</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Team code — always visible */}
        <View style={styles.codeSection}>
          <Text style={styles.codeLabel}>TEAM CODE</Text>
          <Text style={styles.codeText}>{team.code}</Text>
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeBtn} onPress={handleCopyCode}>
              <Ionicons name="copy-outline" size={15} color="#1f89ee" />
              <Text style={styles.codeBtnText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.codeBtn} onPress={handleShareCode}>
              <Ionicons name="share-outline" size={15} color="#1f89ee" />
              <Text style={styles.codeBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Manage players toggle */}
        <TouchableOpacity
          style={styles.expandToggle}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.expandToggleText}>
            {expanded ? 'Hide Players' : 'Manage Players'}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#1f89ee"
          />
        </TouchableOpacity>

        {/* Expanded content */}
        {expanded && (
          <View style={styles.expandedSection}>
            <TouchableOpacity
              style={styles.addPlayerBtn}
              onPress={() => setAddPlayerVisible(true)}
            >
              <Ionicons name="person-add-outline" size={17} color="#FFF" />
              <Text style={styles.addPlayerBtnText}>Add Player</Text>
            </TouchableOpacity>

            {loadingPlayers ? (
              <ActivityIndicator color="#1f89ee" style={{ marginVertical: 16 }} />
            ) : players.length === 0 ? (
              <Text style={styles.noPlayersText}>No players yet. Add one above.</Text>
            ) : (
              <View style={styles.playerList}>
                {players.map((player) => (
                  <View key={player.id} style={styles.playerRow}>
                    <Image
                      source={{
                        uri: player.avatar_url ||
                          'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                      }}
                      style={styles.playerAvatar}
                    />
                    <Text style={styles.playerName} numberOfLines={1}>
                      {player.display_name || player.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemovePlayer(player)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.teamActions}>
              <TouchableOpacity
                style={[styles.newSeasonBtn, startingNewSeason && styles.btnDisabled]}
                onPress={handleNewSeason}
                disabled={startingNewSeason}
              >
                {startingNewSeason ? (
                  <ActivityIndicator size="small" color="#1f89ee" />
                ) : (
                  <>
                    <Ionicons name="refresh-circle-outline" size={16} color="#1f89ee" />
                    <Text style={styles.newSeasonBtnText}>Start New Season</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.archiveBtn} onPress={handleArchiveTeam}>
                <Text style={styles.archiveBtnText}>Archive Team</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ADD PLAYER MODAL */}
      <Modal
        transparent
        visible={addPlayerVisible}
        animationType="slide"
        onRequestClose={() => !addPlayerSaving && setAddPlayerVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ flex: 1 }}
            onPress={() => !addPlayerSaving && setAddPlayerVisible(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => !addPlayerSaving && setAddPlayerVisible(false)}
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <Ionicons name="person-add" size={32} color="#1f89ee" />
              <Text style={styles.modalTitle}>Add Player</Text>
              <Text style={styles.modalSubtitle}>Adding to {team.name}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Player's full name"
                placeholderTextColor="#9CA3AF"
                value={addPlayerName}
                onChangeText={setAddPlayerName}
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="Their login email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={addPlayerEmail}
                onChangeText={setAddPlayerEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Temporary Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="They can change this later"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={addPlayerPassword}
                onChangeText={setAddPlayerPassword}
              />
              <Text style={styles.inputHint}>Share this password with the player so they can sign in</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, addPlayerSaving && styles.btnDisabled]}
              onPress={handleAddPlayer}
              disabled={addPlayerSaving}
            >
              {addPlayerSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Add to Team</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── ManageTab ───────────────────────────────────────────────────────────────

export default function ManageTab({ activeTeamId, onTeamSwitch }: ManageTabProps) {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: coachTeams = [] } = useCoachTeams(user?.id);
  const teamIds = coachTeams.map((t) => t.id);
  const { data: playerCounts = {} } = useCoachTeamPlayerCounts(teamIds);

  const handleArchived = (archivedTeamId: string) => {
    // If the archived team was active, coach has no active team now
    // They'll need to set another active team
    if (archivedTeamId === activeTeamId) {
      Alert.alert(
        'Team Archived',
        'Your active team was archived. Please set another team as active.',
      );
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Teams</Text>
        <View style={styles.teamCountBadge}>
          <Text style={styles.teamCountText}>{coachTeams.length}/3</Text>
        </View>
      </View>

      {coachTeams.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>No teams yet</Text>
          <Text style={styles.emptyStateSubtitle}>Create your first team below</Text>
        </View>
      ) : (
        coachTeams.map((team) => (
          <TeamCardItem
            key={team.id}
            team={team}
            playerCount={playerCounts[team.id] ?? 0}
            isActive={team.id === activeTeamId}
            userId={user?.id ?? ''}
            onSwitchToActive={() => onTeamSwitch(team.id)}
            onArchived={() => handleArchived(team.id)}
          />
        ))
      )}

      <TouchableOpacity
        style={[styles.createTeamBtn, coachTeams.length >= 3 && styles.createTeamBtnDisabled]}
        onPress={() => {
          if (coachTeams.length >= 3) {
            Alert.alert('Team Limit Reached', 'Coach plan supports up to 3 teams.');
            return;
          }
          router.push('/(modals)/create-team');
        }}
        activeOpacity={0.8}
      >
        {coachTeams.length >= 3 ? (
          <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
        ) : (
          <Ionicons name="add-circle-outline" size={20} color="#FFF" />
        )}
        <Text style={[
          styles.createTeamBtnText,
          coachTeams.length >= 3 && styles.createTeamBtnTextDisabled,
        ]}>
          {coachTeams.length >= 3 ? 'Team Limit Reached (3/3)' : 'Create New Team'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  teamCountBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  teamCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1f89ee',
  },

  // Team card
  teamCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  teamCardActive: {
    borderColor: '#1f89ee',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seasonBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  seasonBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  playerCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#31af4d',
  },
  setActiveBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  setActiveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1f89ee',
  },

  // Code section
  codeSection: {
    backgroundColor: '#F8FAFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  codeText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: 5,
    marginBottom: 12,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  codeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  codeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },

  // Expand toggle
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  expandToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },

  // Expanded section
  expandedSection: {
    marginTop: 14,
  },
  addPlayerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1f89ee',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 14,
  },
  addPlayerBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  noPlayersText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 12,
  },
  playerList: {
    gap: 2,
    marginBottom: 14,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  playerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  teamActions: {
    gap: 8,
  },
  newSeasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1f89ee',
    borderStyle: 'dashed',
  },
  newSeasonBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },
  archiveBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  archiveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // Create team button
  createTeamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffb724',
    borderRadius: 16,
    paddingVertical: 18,
    shadowColor: '#ffb724',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  createTeamBtnDisabled: {
    backgroundColor: '#F3F4F6',
    shadowOpacity: 0,
    elevation: 0,
  },
  createTeamBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  createTeamBtnTextDisabled: {
    color: '#9CA3AF',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6B7280',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },

  // Add player modal (sheet)
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
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
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 4,
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
    fontSize: 16,
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
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#ffb724',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: 0.5,
  },
});
