import ChallengeAttemptModal from '@/components/modals/ChallengeAttemptModal';
import ChallengeSetupModal from '@/components/modals/ChallengeSetupModal';
import TeammatePickerModal from '@/components/modals/TeammatePickerModal';
import { useCancelCoachChallenge, usePlayerCoachChallenges } from '@/hooks/useCoachChallenges';
import {
  useCancelPlayerChallenge,
  usePlayerChallenges,
  useRespondToChallenge,
  type PlayerChallenge,
} from '@/hooks/usePlayerChallenges';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


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
  push_token: string | null;
}

interface ChallengesCardProps {
  userId: string;
  teamId: string | null | undefined;
}

export default function ChallengesCard({ userId, teamId }: ChallengesCardProps) {
  const { data: challenges = [] } = usePlayerChallenges(userId);
  const { data: coachChallenges = [] } = usePlayerCoachChallenges(userId);
  const { mutate: respond } = useRespondToChallenge();
  const { mutate: cancelPlayer } = useCancelPlayerChallenge();
  const { mutate: cancelCoach } = useCancelCoachChallenge();

  const [expanded, setExpanded] = useState(false);
  const [attemptChallenge, setAttemptChallenge] = useState<PlayerChallenge | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTeammate, setSelectedTeammate] = useState<Teammate | null>(null);

  const pendingCount = challenges.filter(
    (c) => c.status === 'pending' && c.challenged_id === userId,
  ).length;
  const activeCoachChallenges = coachChallenges.filter((c) => c.status === 'active');

  const activeChallenges = challenges.filter((c) => c.status !== 'completed');
  const completedChallenges = challenges.filter((c) => c.status === 'completed').slice(0, 5);
  const displayedChallenges = [...activeChallenges, ...completedChallenges];

  return (
    <>
      <View style={[styles.container, (pendingCount > 0 || activeCoachChallenges.length > 0) && styles.containerAlert]}>
        {/* Header — toggles dropdown */}
        <TouchableOpacity style={styles.header} onPress={() => setExpanded((v) => !v)} activeOpacity={0.8}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Challenges</Text>
            {pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color='#78909C' />
        </TouchableOpacity>

        {/* Rows — only visible when expanded */}
        {expanded && <View style={styles.rows}>
          {/* Coach-assigned challenges */}
          {activeCoachChallenges.length > 0 && (
            <View style={styles.coachSection}>
              <Text style={styles.coachSectionLabel}>Coach Challenges</Text>
              {activeCoachChallenges.map((c) => (
                <View key={c.id} style={styles.coachRow}>
                  <View style={styles.coachRowLeft}>
                    <Text style={styles.coachRowTarget}>{c.touches_target.toLocaleString()} touches</Text>
                    <Text style={styles.coachRowDetail}>Due {c.due_date}</Text>
                    <View style={styles.coachStatusRow}>
                      <View style={styles.coachBadge}>
                        <Text style={styles.coachBadgeText}>🎯 Coach Challenge</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          Alert.alert('Cancel Challenge?', 'This will remove the challenge.', [
                            { text: 'Keep', style: 'cancel' },
                            {
                              text: 'Cancel',
                              style: 'destructive',
                              onPress: () => cancelCoach({ challengeId: c.id, coachId: c.coach_id, playerId: c.player_id }),
                            },
                          ])
                        }
                      >
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          {displayedChallenges.length === 0 && activeCoachChallenges.length === 0 && (
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
          {displayedChallenges.map((c) => (
            <ChallengeRow
              key={c.id}
              challenge={c}
              userId={userId}
              onRespond={(accept) =>
                respond({
                  challengeId: c.id,
                  accept,
                  timeLimitHours: c.time_limit_hours,
                  challengerId: c.challenger_id,
                  responderId: userId,
                  responderName: c.challenged_name ?? '',
                  challengerPushToken: c.challenger_push_token ?? null,
                })
              }
              onAttempt={() => setAttemptChallenge(c)}
              onCancel={(expired?: boolean) =>
                Alert.alert(
                  expired ? 'Delete Challenge?' : 'Cancel Challenge?',
                  expired ? 'This will remove the expired challenge.' : 'This will remove the challenge for both players.',
                  [
                    { text: 'Keep', style: 'cancel' },
                    { text: expired ? 'Delete' : 'Cancel Challenge', style: 'destructive', onPress: () => cancelPlayer({ challengeId: c.id }) },
                  ],
                )
              }
            />
          ))}
        </View>}
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
          challengedPushToken={selectedTeammate.push_token}
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
  onCancel: (expired?: boolean) => void;
}

function ChallengeRow({ challenge: c, userId, onRespond, onAttempt, onCancel }: ChallengeRowProps) {
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
    const expired = timeRemaining(c.expires_at) === 'Expired';
    return (
      <View style={styles.outgoingRow}>
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={styles.rowName}>vs {opponentName}</Text>
            {expired ? (
              <View style={styles.expiredBadge}>
                <Text style={styles.expiredBadgeText}>Expired</Text>
              </View>
            ) : (
              <View style={styles.waitingBadge}>
                <Text style={styles.waitingText}>Waiting</Text>
              </View>
            )}
          </View>
          <Text style={styles.rowDetail}>{c.touches_target} touches · {c.time_limit_hours}h window</Text>
          {!expired && (
            <Text style={styles.timerText}>{timeRemaining(c.expires_at)} to accept</Text>
          )}
          <TouchableOpacity onPress={() => onCancel(expired)} style={styles.cancelRow}>
            <Text style={styles.cancelText}>{expired ? 'Delete' : 'Cancel Challenge'}</Text>
          </TouchableOpacity>
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
            <TouchableOpacity onPress={() => onCancel()} style={styles.cancelRow}>
              <Text style={styles.cancelText}>Cancel Challenge</Text>
            </TouchableOpacity>
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
  containerAlert: {
    borderColor: '#EF4444',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  cancelRow: {
    marginTop: 6,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },

  // COACH CHALLENGES
  coachSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 4,
    marginBottom: 4,
  },
  coachSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  coachRowLeft: {
    gap: 2,
  },
  coachRowTarget: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  coachRowDetail: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  coachStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  coachBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  coachBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
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
  expiredBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expiredBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
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
