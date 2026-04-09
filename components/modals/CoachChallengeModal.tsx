import { useCreateCoachChallenge } from '@/hooks/useCoachChallenges';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Player {
  id: string;
  name: string;
}

interface CoachChallengeModalProps {
  visible: boolean;
  onClose: () => void;
  coachId: string;
  teamId: string;
  preselectedPlayer?: { id: string; name: string };
}

export default function CoachChallengeModal({
  visible,
  onClose,
  coachId,
  teamId,
  preselectedPlayer,
}: CoachChallengeModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(preselectedPlayer ?? null);
  const [touchesTarget, setTouchesTarget] = useState('');
  const [daysFromNow, setDaysFromNow] = useState('7');

  // Sync preselected player when modal opens
  React.useEffect(() => {
    if (visible) {
      setSelectedPlayer(preselectedPlayer ?? null);
      setTouchesTarget('');
      setDaysFromNow('7');
    }
  }, [visible, preselectedPlayer?.id]);

  const { mutate: createChallenge, isPending } = useCreateCoachChallenge();

  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ['team-players-for-challenge', teamId],
    enabled: visible && !!teamId,
    queryFn: async (): Promise<Player[]> => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, display_name')
        .eq('team_id', teamId)
        .eq('is_coach', false)
        .order('name');
      return (data || []).map((p) => ({
        id: p.id,
        name: p.display_name || p.name || 'Unknown',
      }));
    },
  });

  const handleClose = () => {
    setSelectedPlayer(null);
    setTouchesTarget('');
    setDaysFromNow('7');
    onClose();
  };

  const getDueDate = () => {
    const days = parseInt(daysFromNow, 10);
    if (isNaN(days) || days < 1) return null;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const canCreate =
    selectedPlayer &&
    parseInt(touchesTarget, 10) > 0 &&
    parseInt(daysFromNow, 10) > 0 &&
    !isPending;

  const handleCreate = () => {
    if (!canCreate || !selectedPlayer) return;
    const dueDate = getDueDate();
    if (!dueDate) return;

    createChallenge(
      {
        coachId,
        playerId: selectedPlayer.id,
        teamId,
        touchesTarget: parseInt(touchesTarget, 10),
        dueDate,
      },
      { onSuccess: handleClose },
    );
  };

  return (
    <Modal visible={visible} animationType='slide' presentationStyle='pageSheet' onRequestClose={handleClose}>
      <View style={[styles.container, { paddingTop: insets.top || 20 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Assign Challenge</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name='close' size={22} color='#1a1a2e' />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps='handled'>
          {/* Player picker — hidden when preselected */}
          {preselectedPlayer ? (
            <View style={styles.preselectedPlayer}>
              <Ionicons name='person' size={18} color='#1f89ee' />
              <Text style={styles.preselectedPlayerName}>{preselectedPlayer.name}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Select Player</Text>
              {playersLoading ? (
                <ActivityIndicator color='#1f89ee' style={{ marginVertical: 12 }} />
              ) : (
                <View style={styles.playerList}>
                  {players.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.playerRow, selectedPlayer?.id === p.id && styles.playerRowSelected]}
                      onPress={() => setSelectedPlayer(p)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.playerName, selectedPlayer?.id === p.id && styles.playerNameSelected]}>
                        {p.name}
                      </Text>
                      {selectedPlayer?.id === p.id && (
                        <Ionicons name='checkmark' size={18} color='#1f89ee' />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Touches target */}
          <Text style={[styles.label, { marginTop: 20 }]}>Touches Target</Text>
          <TextInput
            style={styles.input}
            value={touchesTarget}
            onChangeText={setTouchesTarget}
            keyboardType='number-pad'
            placeholder='e.g. 5000'
            placeholderTextColor='#B0BEC5'
          />

          {/* Days to complete */}
          <Text style={[styles.label, { marginTop: 20 }]}>Days to Complete</Text>
          <View style={styles.daysRow}>
            {['3', '7', '14', '30'].map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.dayPill, daysFromNow === d && styles.dayPillActive]}
                onPress={() => setDaysFromNow(d)}
              >
                <Text style={[styles.dayPillText, daysFromNow === d && styles.dayPillTextActive]}>
                  {d}d
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {getDueDate() && (
            <Text style={styles.dueDateHint}>Due: {getDueDate()}</Text>
          )}
        </ScrollView>

        {/* Create button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
            onPress={handleCreate}
            disabled={!canCreate}
            activeOpacity={0.8}
          >
            {isPending ? (
              <ActivityIndicator color='#FFF' />
            ) : (
              <Text style={styles.createBtnText}>Assign Challenge</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  preselectedPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF4FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: '#1f89ee',
  },
  preselectedPlayerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1f89ee',
  },
  playerList: {
    gap: 6,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  playerRowSelected: {
    borderColor: '#1f89ee',
    backgroundColor: '#EBF4FF',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  playerNameSelected: {
    color: '#1f89ee',
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  dayPillActive: {
    backgroundColor: '#1f89ee',
    borderColor: '#1f89ee',
  },
  dayPillText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  dayPillTextActive: {
    color: '#FFF',
  },
  dueDateHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  createBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createBtnDisabled: {
    backgroundColor: '#B0BEC5',
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
});
