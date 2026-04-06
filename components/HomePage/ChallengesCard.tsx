import ChallengeAttemptModal from '@/components/modals/ChallengeAttemptModal';
import ChallengeSetupModal from '@/components/modals/ChallengeSetupModal';
import TeammatePickerModal from '@/components/modals/TeammatePickerModal';
import {
  usePlayerChallenges,
  useRespondToChallenge,
  type PlayerChallenge,
} from '@/hooks/usePlayerChallenges';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';


function timeRemaining(isoDate: string) {
  const ms = new Date(isoDate).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

interface Teammate {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface ChallengesCardProps {
  userId: string;
  teamId: string | null | undefined;
}

export default function ChallengesCard({ userId, teamId }: ChallengesCardProps) {
  const { data: challenges = [] } = usePlayerChallenges(userId);
  const { mutate: respond } = useRespondToChallenge();

  const [attemptChallenge, setAttemptChallenge] = useState<PlayerChallenge | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTeammate, setSelectedTeammate] = useState<Teammate | null>(null);

  const pendingCount = challenges.filter(
    (c) => c.status === 'pending' && c.challenged_id === userId,
  ).length;

  return (
    <>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
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
          {challenges.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No active challenges</Text>
              {teamId ? (
                <TouchableOpacity style={styles.challengeBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
                  <Text style={styles.challengeBtnText}>⚔️ Challenge a Teammate</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.emptySubtitle}>Join a team to challenge teammates</Text>
              )}
            </View>
          )}
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

      {teamId && (
        <TeammatePickerModal
          visible={showPicker}
          onClose={() => setShowPicker(false)}
          teamId={teamId}
          currentUserId={userId}
          onSelect={(teammate) => {
            setShowPicker(false);
            setSelectedTeammate(teammate);
          }}
        />
      )}

      {selectedTeammate && (
        <ChallengeSetupModal
          visible={!!selectedTeammate}
          onClose={() => setSelectedTeammate(null)}
          challengerId={userId}
          challengedId={selectedTeammate.id}
          challengedName={selectedTeammate.name}
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
          <Text style={styles.timerText}>{timeRemaining(c.expires_at)} to accept</Text>
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
              <Text style={styles.waitingText}>Waiting</Text>
            </View>
          </View>
          <Text style={styles.rowDetail}>{c.touches_target} touches · {c.time_limit_hours}h window</Text>
          <Text style={styles.timerText}>{timeRemaining(c.expires_at)} to accept</Text>
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
            <Text style={styles.timerText}>{timeRemaining(c.deadline_at)} to complete</Text>
          )}
          <View style={styles.activeBottom}>
            {iDone && !theyDone ? (
              <View style={styles.waitingBadge}>
                <Text style={styles.waitingText}>Waiting for {opponentName}…</Text>
              </View>
            ) : !iDone ? (
              <TouchableOpacity style={styles.goBtn} onPress={onAttempt}>
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
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  pendingBadge: {
    backgroundColor: '#1f89ee',
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
    color: '#FFF',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  rows: {
    gap: 0,
  },

  emptyState: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  challengeBtn: {
    marginTop: 4,
    backgroundColor: '#1f89ee',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  challengeBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },

  // ROWS (shared)
  incomingRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  incomingAccent: {},
  activeRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activeAccent: {},
  outgoingRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  rowName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
    flex: 1,
  },
  targetBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  targetBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  targetBadgeOrange: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  targetBadgeOrangeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  rowDetail: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  timerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
  },
  incomingActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#1f89ee',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
  declineBtn: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  waitingBadge: {
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
  activeBottom: {
    marginTop: 6,
  },
  goBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 13,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  completedRowWin: {},
  resultMid: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  resultTitleWin: {},
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
  timeChipWin: {},
});
