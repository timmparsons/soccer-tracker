import ChallengeAttemptModal from '@/components/modals/ChallengeAttemptModal';
import {
  PlayerChallenge,
  usePlayerChallenges,
  useRespondToChallenge,
} from '@/hooks/usePlayerChallenges';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// MOCK — remove when player_challenges table is set up in Supabase
const MOCK_CHALLENGES: PlayerChallenge[] = __DEV__
  ? [
      {
        id: 'mock-incoming',
        challenger_id: 'other-user-1',
        challenged_id: 'current-user',
        touches_target: 100,
        time_limit_hours: 24,
        status: 'pending',
        expires_at: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
        deadline_at: null,
        challenger_time_seconds: null,
        challenger_completed_at: null,
        challenged_time_seconds: null,
        challenged_completed_at: null,
        winner_id: null,
        created_at: new Date().toISOString(),
        challenger_name: 'Jamie',
        challenger_avatar: null,
        challenged_name: 'You',
        challenged_avatar: null,
      },
      {
        id: 'mock-active',
        challenger_id: 'current-user',
        challenged_id: 'other-user-2',
        touches_target: 200,
        time_limit_hours: 48,
        status: 'accepted',
        expires_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        deadline_at: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
        challenger_time_seconds: null,
        challenger_completed_at: null,
        challenged_time_seconds: null,
        challenged_completed_at: null,
        winner_id: null,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        challenger_name: 'You',
        challenger_avatar: null,
        challenged_name: 'Alex',
        challenged_avatar: null,
      },
    ]
  : [];

function timeRemaining(isoDate: string) {
  const ms = new Date(isoDate).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

interface ChallengesCardProps {
  userId: string;
}

export default function ChallengesCard({ userId }: ChallengesCardProps) {
  const { data: liveChallenges = [] } = usePlayerChallenges(userId);
  const { mutate: respond } = useRespondToChallenge();
  const [attemptChallenge, setAttemptChallenge] = useState<PlayerChallenge | null>(null);

  // Swap mock's 'current-user' placeholder with real userId for demo rendering
  const mockWithRealId = MOCK_CHALLENGES.map((c) => ({
    ...c,
    challenger_id: c.challenger_id === 'current-user' ? userId : c.challenger_id,
    challenged_id: c.challenged_id === 'current-user' ? userId : c.challenged_id,
  }));

  const challenges = liveChallenges.length > 0 ? liveChallenges : mockWithRealId;

  if (challenges.length === 0) return null;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>⚔️  Challenges</Text>
          <Text style={styles.cardCount}>{challenges.length}</Text>
        </View>

        {challenges.map((c) => (
          <ChallengeRow
            key={c.id}
            challenge={c}
            userId={userId}
            onRespond={(accept) =>
              respond({ challengeId: c.id, accept, timeLimitHours: c.time_limit_hours })
            }
            onAttempt={() => setAttemptChallenge(c)}
          />
        ))}
      </View>

      {attemptChallenge && (
        <ChallengeAttemptModal
          visible={!!attemptChallenge}
          onClose={() => setAttemptChallenge(null)}
          challenge={attemptChallenge}
          currentUserId={userId}
        />
      )}
    </>
  );
}

interface ChallengeRowProps {
  challenge: PlayerChallenge;
  userId: string;
  onRespond: (accept: boolean) => void;
  onAttempt: () => void;
}

function ChallengeRow({ challenge: c, userId, onRespond, onAttempt }: ChallengeRowProps) {
  const isChallenger = c.challenger_id === userId;
  const opponentName = isChallenger ? c.challenged_name : c.challenger_name;
  const myTime = isChallenger ? c.challenger_time_seconds : c.challenged_time_seconds;
  const opponentTime = isChallenger ? c.challenged_time_seconds : c.challenger_time_seconds;

  // Incoming pending
  if (c.status === 'pending' && !isChallenger) {
    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.rowName}>{c.challenger_name}</Text>
          <Text style={styles.rowDetail}>
            challenged you — {c.touches_target} touches in {c.time_limit_hours}h
          </Text>
          <Text style={styles.rowTimer}>{timeRemaining(c.expires_at)} to accept</Text>
        </View>
        <View style={styles.rowActions}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => onRespond(true)}>
            <Text style={styles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={() => onRespond(false)}>
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Outgoing pending (waiting for opponent to accept)
  if (c.status === 'pending' && isChallenger) {
    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.rowName}>vs {opponentName}</Text>
          <Text style={styles.rowDetail}>{c.touches_target} touches in {c.time_limit_hours}h</Text>
          <Text style={styles.rowTimer}>{timeRemaining(c.expires_at)} to accept</Text>
        </View>
        <View style={styles.waitingBadge}>
          <Ionicons name='hourglass-outline' size={14} color='#78909C' />
          <Text style={styles.waitingText}>Waiting</Text>
        </View>
      </View>
    );
  }

  // Accepted — need to complete
  if (c.status === 'accepted') {
    const iDone = myTime !== null;
    const theyDone = opponentTime !== null;

    return (
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.rowName}>vs {opponentName}</Text>
          <Text style={styles.rowDetail}>{c.touches_target} touches</Text>
          {c.deadline_at && (
            <Text style={styles.rowTimer}>{timeRemaining(c.deadline_at)} to complete</Text>
          )}
        </View>
        {iDone && !theyDone ? (
          <View style={styles.waitingBadge}>
            <Ionicons name='hourglass-outline' size={14} color='#78909C' />
            <Text style={styles.waitingText}>Waiting</Text>
          </View>
        ) : !iDone ? (
          <TouchableOpacity style={styles.goBtn} onPress={onAttempt}>
            <Text style={styles.goBtnText}>Go!</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  // Completed — show result
  if (c.status === 'completed') {
    const iWon = c.winner_id === userId;
    const mySeconds = myTime ?? 0;
    const theirSeconds = opponentTime ?? 0;
    const fmt = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${String(sec).padStart(2, '0')}`;
    };

    return (
      <View style={[styles.row, styles.completedRow]}>
        <View style={styles.resultLeft}>
          <Text style={styles.resultEmoji}>{iWon ? '🏆' : '💪'}</Text>
          <View>
            <Text style={styles.rowName}>{iWon ? 'You won!' : `${opponentName} won`}</Text>
            <Text style={styles.rowDetail}>vs {opponentName} — {c.touches_target} touches</Text>
          </View>
        </View>
        <View style={styles.timesCol}>
          <Text style={[styles.timeChip, iWon && styles.timeChipWin]}>You {fmt(mySeconds)}</Text>
          <Text style={[styles.timeChip, !iWon && styles.timeChipWin]}>
            {opponentName} {fmt(theirSeconds)}
          </Text>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  cardCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  completedRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    borderTopWidth: 0,
    marginTop: 2,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  rowDetail: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  rowTimer: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffb724',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: '#31af4d',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
  },
  declineBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  waitingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
  },
  goBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  goBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  resultEmoji: {
    fontSize: 24,
  },
  timesCol: {
    gap: 4,
    alignItems: 'flex-end',
  },
  timeChip: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timeChipWin: {
    backgroundColor: '#D1FAE5',
    color: '#31af4d',
  },
});
