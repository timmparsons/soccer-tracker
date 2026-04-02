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

  const pendingCount = challenges.filter(
    (c) => c.status === 'pending' && c.challenged_id === userId,
  ).length;

  return (
    <>
      <View style={styles.container}>
        {/* Dark header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEmoji}>⚔️</Text>
            <Text style={styles.headerTitle}>Challenges</Text>
            {pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerSub}>{challenges.length} active</Text>
        </View>

        {/* Rows */}
        <View style={styles.rows}>
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

  // Incoming pending — make this one scream for attention
  if (c.status === 'pending' && !isChallenger) {
    return (
      <View style={styles.incomingRow}>
        <View style={styles.incomingAccent} />
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={styles.incomingName}>{c.challenger_name}</Text>
            <View style={styles.targetBadge}>
              <Text style={styles.targetBadgeText}>{c.touches_target} touches</Text>
            </View>
          </View>
          <Text style={styles.rowDetail}>challenged you · {c.time_limit_hours}h to complete</Text>
          <Text style={styles.timerText}>
            <Ionicons name='time-outline' size={11} /> {timeRemaining(c.expires_at)} to accept
          </Text>
          <View style={styles.incomingActions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => onRespond(true)}>
              <Text style={styles.acceptBtnText}>Accept Challenge</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineBtn} onPress={() => onRespond(false)}>
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Outgoing pending
  if (c.status === 'pending' && isChallenger) {
    return (
      <View style={styles.outgoingRow}>
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={styles.rowName}>vs {opponentName}</Text>
            <View style={styles.waitingBadge}>
              <Ionicons name='hourglass-outline' size={12} color='#78909C' />
              <Text style={styles.waitingText}>Waiting</Text>
            </View>
          </View>
          <Text style={styles.rowDetail}>{c.touches_target} touches · {c.time_limit_hours}h window</Text>
          <Text style={styles.timerText}>
            <Ionicons name='time-outline' size={11} /> {timeRemaining(c.expires_at)} to accept
          </Text>
        </View>
      </View>
    );
  }

  // Accepted — active challenge
  if (c.status === 'accepted') {
    const iDone = myTime !== null;
    const theyDone = opponentTime !== null;

    return (
      <View style={styles.activeRow}>
        <View style={styles.activeAccent} />
        <View style={[styles.rowContent, styles.activeContent]}>
          <View style={styles.rowTop}>
            <Text style={styles.rowName}>vs {opponentName}</Text>
            <View style={styles.targetBadgeOrange}>
              <Text style={styles.targetBadgeOrangeText}>{c.touches_target} touches</Text>
            </View>
          </View>
          {c.deadline_at && (
            <Text style={styles.timerText}>
              <Ionicons name='time-outline' size={11} /> {timeRemaining(c.deadline_at)} to complete
            </Text>
          )}
          <View style={styles.activeBottom}>
            {iDone && !theyDone ? (
              <View style={styles.waitingBadge}>
                <Ionicons name='hourglass-outline' size={12} color='#78909C' />
                <Text style={styles.waitingText}>Waiting for {opponentName}…</Text>
              </View>
            ) : !iDone ? (
              <TouchableOpacity style={styles.goBtn} onPress={onAttempt}>
                <Ionicons name='play' size={16} color='#FFF' />
                <Text style={styles.goBtnText}>Go!</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  // Completed
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
      <View style={[styles.completedRow, iWon && styles.completedRowWin]}>
        <Text style={styles.resultEmoji}>{iWon ? '🏆' : '💪'}</Text>
        <View style={styles.resultMid}>
          <Text style={[styles.resultTitle, iWon && styles.resultTitleWin]}>
            {iWon ? 'You won!' : `${opponentName} won`}
          </Text>
          <Text style={styles.rowDetail}>vs {opponentName} · {c.touches_target} touches</Text>
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
    marginBottom: 12,
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  pendingBadge: {
    backgroundColor: '#ffb724',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  rows: {
    gap: 0,
  },

  // INCOMING ROW
  incomingRow: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  incomingAccent: {
    width: 4,
    backgroundColor: '#31af4d',
  },
  rowContent: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  activeContent: {
    gap: 5,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  incomingName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1a1a2e',
    flex: 1,
  },
  targetBadge: {
    backgroundColor: '#31af4d',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  targetBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
  },
  rowDetail: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffb724',
  },
  incomingActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#31af4d',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
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
    paddingVertical: 10,
    alignItems: 'center',
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },

  // OUTGOING ROW
  outgoingRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rowName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
    flex: 1,
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  waitingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78909C',
  },

  // ACTIVE ROW
  activeRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFBF0',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  activeAccent: {
    width: 4,
    backgroundColor: '#ffb724',
  },
  targetBadgeOrange: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#ffb724',
  },
  targetBadgeOrangeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#B45309',
  },
  activeBottom: {
    marginTop: 6,
  },
  goBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  goBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },

  // COMPLETED ROW
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  completedRowWin: {
    backgroundColor: '#F0FDF4',
  },
  resultEmoji: {
    fontSize: 26,
  },
  resultMid: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  resultTitleWin: {
    color: '#31af4d',
  },
  timesCol: {
    gap: 4,
    alignItems: 'flex-end',
  },
  timeChip: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78909C',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  timeChipWin: {
    backgroundColor: '#D1FAE5',
    color: '#31af4d',
  },
});
