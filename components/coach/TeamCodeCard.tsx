import { useStartNewSeason } from '@/hooks/useSeasons';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TeamCodeCardProps {
  teamId: string;
  userId: string;
  onDelete?: (teamId: string, teamName: string) => void;
}

export default function TeamCodeCard({ teamId, userId, onDelete }: TeamCodeCardProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [addPlayerVisible, setAddPlayerVisible] = useState(false);
  const [addPlayerName, setAddPlayerName] = useState('');
  const [addPlayerEmail, setAddPlayerEmail] = useState('');
  const [addPlayerPassword, setAddPlayerPassword] = useState('');
  const [addPlayerSaving, setAddPlayerSaving] = useState(false);
  const [newSeasonCode, setNewSeasonCode] = useState<string | null>(null);
  const { mutateAsync: startNewSeason, isPending: startingNewSeason } = useStartNewSeason();

  const { data: team } = useQuery({
    queryKey: ['coach-team', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleCopyCode = async () => {
    if (!team?.code) return;
    await Clipboard.setStringAsync(team.code);
    Alert.alert('Copied!', 'Team code copied to clipboard');
  };

  const handleShareCode = async () => {
    if (!team?.code) return;
    try {
      await Share.share({
        message: `Join my team "${team.name}" on Master Touch!\n\nTeam Code: ${team.code}`,
      });
    } catch {
      // Sharing cancelled
    }
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
      queryClient.invalidateQueries({ queryKey: ['coach-team-players', teamId] });
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setAddPlayerSaving(false);
    }
  };

  const handleStartNewSeason = () => {
    if (!team) return;
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
              const { newCode } = await startNewSeason({
                teamId: team.id,
                currentSeasonNumber: team.season_number ?? 1,
                currentSeasonStartDate: team.season_start_date ?? team.created_at,
                finalTeamXp: team.team_xp,
                finalTeamLevel: team.team_level,
                playerStandings: [],
              });
              setNewSeasonCode(newCode);
              queryClient.invalidateQueries({ queryKey: ['coach-team', teamId] });
              queryClient.invalidateQueries({ queryKey: ['coach-team-players', teamId] });
            } catch {
              Alert.alert('Error', 'Failed to start new season. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <View style={styles.card}>
        {team?.name && (
          <Text style={styles.teamName}>{team.name}</Text>
        )}
        <View style={styles.codeHeader}>
          <Ionicons name="key" size={20} color="#1f89ee" />
          <Text style={styles.codeLabel}>
            Team Code{team?.season_number ? ` · Season ${team.season_number}` : ''}
          </Text>
        </View>
        <Text style={styles.codeText}>{team?.code || '---'}</Text>
        <View style={styles.codeActions}>
          <TouchableOpacity style={styles.codeButton} onPress={handleCopyCode}>
            <Ionicons name="copy-outline" size={18} color="#1f89ee" />
            <Text style={styles.codeButtonText}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.codeButton} onPress={handleShareCode}>
            <Ionicons name="share-outline" size={18} color="#1f89ee" />
            <Text style={styles.codeButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.codeButton} onPress={() => setAddPlayerVisible(true)}>
            <Ionicons name="person-add-outline" size={18} color="#1f89ee" />
            <Text style={styles.codeButtonText}>Add Player</Text>
          </TouchableOpacity>
        </View>

        {newSeasonCode && (
          <View style={styles.newSeasonBanner}>
            <Text style={styles.newSeasonBannerTitle}>New season started!</Text>
            <Text style={styles.newSeasonBannerSub}>Share this code with new players to join:</Text>
            <Text style={styles.newSeasonBannerCode}>{newSeasonCode}</Text>
            <TouchableOpacity
              onPress={() => {
                Clipboard.setStringAsync(newSeasonCode);
                Alert.alert('Copied!', 'New team code copied to clipboard');
              }}
              style={styles.newSeasonCopyBtn}
            >
              <Ionicons name="copy-outline" size={16} color="#FFF" />
              <Text style={styles.newSeasonCopyBtnText}>Copy New Code</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setNewSeasonCode(null)}>
              <Text style={styles.newSeasonDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.newSeasonBtn, startingNewSeason && styles.newSeasonBtnDisabled]}
          onPress={handleStartNewSeason}
          disabled={startingNewSeason}
        >
          {startingNewSeason ? (
            <ActivityIndicator size="small" color="#1f89ee" />
          ) : (
            <>
              <Ionicons name="refresh-circle-outline" size={18} color="#1f89ee" />
              <Text style={styles.newSeasonBtnText}>Start New Season</Text>
            </>
          )}
        </TouchableOpacity>

        {onDelete && (
          <TouchableOpacity
            style={styles.deleteTeamBtn}
            onPress={() => onDelete(teamId, team?.name ?? 'this team')}
          >
            <Ionicons name="trash-outline" size={16} color="#D32F2F" />
            <Text style={styles.deleteTeamBtnText}>Delete Team</Text>
          </TouchableOpacity>
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
              style={[styles.saveButton, addPlayerSaving && styles.saveButtonDisabled]}
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

const styles = StyleSheet.create({
  card: {
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
  teamName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 8,
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
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  codeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f89ee',
  },
  newSeasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1f89ee',
    borderStyle: 'dashed',
  },
  newSeasonBtnDisabled: {
    opacity: 0.5,
  },
  newSeasonBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },
  newSeasonBanner: {
    marginTop: 12,
    backgroundColor: '#EEF7FF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  newSeasonBannerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  newSeasonBannerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  newSeasonBannerCode: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1f89ee',
    letterSpacing: 3,
  },
  newSeasonCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1f89ee',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  newSeasonCopyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  deleteTeamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF5F5',
  },
  deleteTeamBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D32F2F',
  },
  newSeasonDismiss: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: 0.5,
  },
});
