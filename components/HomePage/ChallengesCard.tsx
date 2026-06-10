import ChallengeAttemptModal from '@/components/modals/ChallengeAttemptModal';
import ChallengeSetupModal from '@/components/modals/ChallengeSetupModal';
import TeammatePickerModal, { type Teammate } from '@/components/modals/TeammatePickerModal';
import { type GroupChallenge, useDeleteGroupChallenge, useGroupChallenges } from '@/hooks/useGroupChallenges';
import {
  useCancelPlayerChallenge,
  usePlayerChallenges,
  useRespondToChallenge,
  type PlayerChallenge,
} from '@/hooks/usePlayerChallenges';
import { useTouchTracking } from '@/hooks/useTouchTracking';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  teamId: string | null | undefined;
  playerName: string;
}

// Standalone collapsible card for a single challenge
function ChallengeShell({
  title,
  subtitle,
  urgent,
  defaultOpen,
  children,
}: {
  title: string;
  subtitle: string;
  urgent?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <View style={[styles.card, urgent && styles.cardUrgent]}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeaderLeft}>
          {urgent && <View style={styles.urgentDot} />}
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color='#78909C' />
      </TouchableOpacity>
      {open && <View style={styles.cardBody}>{children}</View>}
    </View>
  );
}

const DAILY_GOAL_MINUTES = 15;

export default function ChallengesCard({ userId, teamId, playerName }: ChallengesCardProps) {
  const { data: challenges = [] } = usePlayerChallenges(userId);
  const { data: groupChallenges = [] } = useGroupChallenges(userId);
  const { data: touchStats } = useTouchTracking(userId);
  const todayMinutes = touchStats?.today_minutes ?? 0;
  const { mutate: respond } = useRespondToChallenge();
  const { mutate: cancelPlayer } = useCancelPlayerChallenge();
  const { mutate: deleteGroup } = useDeleteGroupChallenge();

  const [attemptChallenge, setAttemptChallenge] = useState<PlayerChallenge | null>(null);
  const [attemptGroupChallenge, setAttemptGroupChallenge] = useState<GroupChallenge | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [challengedPlayers, setChallengedPlayers] = useState<Teammate[]>([]);

  const pendingCount = challenges.filter(
    (c) => c.status === 'pending' && c.challenged_id === userId,
  ).length;

  const activeChallenges = challenges.filter((c) => c.status !== 'completed');
  const activeGroupChallenges = groupChallenges.filter(
    (gc) => new Date() < new Date(gc.deadline_at),
  );

  const totalActive = activeChallenges.length + activeGroupChallenges.length;

  return (
    <>
      {/* Section header — plain row, not a card */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionTitle}>Teammate Challenges</Text>
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        {teamId && (
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => setShowPicker(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name='add' size={16} color='#1f89ee' />
            <Text style={styles.newBtnText}>New</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Empty state */}
      {totalActive === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {teamId ? 'No current challenges' : 'Join a team to challenge teammates'}
          </Text>
        </View>
      )}

      {/* Group challenge cards */}
      {activeGroupChallenges.map((gc) => {
        const allDone = gc.participants.every((p) => p.completed_at !== null);
        const me = gc.participants.find((p) => p.user_id === userId);
        const iNeedToGo = !allDone && me?.completed_at === null;
        const creatorParticipant = gc.participants.find((p) => p.user_id === gc.created_by);
        const creatorName = gc.created_by === userId ? 'You' : (creatorParticipant?.name ?? 'Someone');
        const subtitle = `${gc.participants.length} players · ${gc.touches_target} touches · by ${creatorName}`;

        return (
          <ChallengeShell
            key={gc.id}
            title='Group Challenge'
            subtitle={subtitle}
            urgent={iNeedToGo}
            defaultOpen={false}
          >
            <GroupChallengeDetail
              gc={gc}
              userId={userId}
              onAttempt={() => setAttemptGroupChallenge(gc)}
              onCancel={() =>
                Alert.alert('Cancel Group Challenge?', 'This will remove the challenge for everyone.', [
                  { text: 'Keep', style: 'cancel' },
                  { text: 'Cancel', style: 'destructive', onPress: () => deleteGroup({ groupChallengeId: gc.id, userId }) },
                ])
              }
            />
          </ChallengeShell>
        );
      })}

      {/* 1v1 challenge cards */}
      {activeChallenges.map((c) => {
        const isChallenger = c.challenger_id === userId;
        const opponentName = isChallenger ? c.challenged_name : c.challenger_name;
        const isPendingIncoming = c.status === 'pending' && !isChallenger;
        const title = isPendingIncoming
          ? `${c.challenger_name} challenged you!`
          : `vs ${opponentName}`;
        const statusLabel = c.status === 'pending'
          ? (isChallenger ? 'Waiting for response' : 'Action needed')
          : 'Active';
        const subtitle = `${c.touches_target} touches · ${statusLabel}`;

        return (
          <ChallengeShell
            key={c.id}
            title={title}
            subtitle={subtitle}
            urgent={isPendingIncoming}
            defaultOpen={isPendingIncoming}
          >
            <ChallengeDetail
              c={c}
              userId={userId}
              todayMinutes={todayMinutes}
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
              onCancel={(expired) =>
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
          </ChallengeShell>
        );
      })}

      {attemptChallenge && (
        <ChallengeAttemptModal
          visible={!!attemptChallenge}
          onClose={() => setAttemptChallenge(null)}
          challenge={attemptChallenge}
          currentUserId={userId}
        />
      )}

      {attemptGroupChallenge && (
        <ChallengeAttemptModal
          visible={!!attemptGroupChallenge}
          onClose={() => setAttemptGroupChallenge(null)}
          groupChallenge={attemptGroupChallenge}
          currentUserId={userId}
        />
      )}

      {teamId && (
        <TeammatePickerModal
          visible={showPicker}
          onClose={() => setShowPicker(false)}
          teamId={teamId}
          currentUserId={userId}
          onSelectMultiple={(teammates) => {
            setShowPicker(false);
            setTimeout(() => setChallengedPlayers(teammates), 400);
          }}
        />
      )}

      {challengedPlayers.length > 0 && teamId && (
        <ChallengeSetupModal
          visible={challengedPlayers.length > 0}
          onClose={() => setChallengedPlayers([])}
          creatorId={userId}
          creatorName={playerName}
          teamId={teamId}
          participants={challengedPlayers}
        />
      )}
    </>
  );
}

// GROUP CHALLENGE EXPANDED DETAIL

interface GroupChallengeDetailProps {
  gc: GroupChallenge;
  userId: string;
  onAttempt: () => void;
  onCancel: () => void;
}

function GroupChallengeDetail({ gc, userId, onAttempt, onCancel }: GroupChallengeDetailProps) {
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const allDone = gc.participants.every((p) => p.completed_at !== null);
  const deadlinePassed = new Date() > new Date(gc.deadline_at);
  const showResults = allDone || deadlinePassed;

  const myParticipant = gc.participants.find((p) => p.user_id === userId);
  const iDone = myParticipant?.completed_at !== null && myParticipant?.completed_at !== undefined;
  const isCreator = gc.created_by === userId;

  const medals = ['🥇', '🥈', '🥉'];

  const rankedParticipants = showResults
    ? [...gc.participants].sort((a, b) => {
        if (a.time_seconds === null) return 1;
        if (b.time_seconds === null) return -1;
        return a.time_seconds - b.time_seconds;
      })
    : null;

  return (
    <View style={styles.detailBody}>
      <Text style={styles.detailMeta}>
        {!showResults ? timeRemaining(gc.deadline_at) : (deadlinePassed ? 'Deadline passed' : 'Finished')}
      </Text>

      {showResults && rankedParticipants ? (
        <View style={styles.participantList}>
          {rankedParticipants.map((p, i) => {
            const isMe = p.user_id === userId;
            return (
              <View key={p.id} style={styles.participantRow}>
                <Text style={styles.medal}>{medals[i] ?? '·'}</Text>
                <Image
                  source={{ uri: p.avatar_url ?? 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                  style={styles.avatar}
                />
                <Text style={[styles.participantName, isMe && styles.participantNameMe]}>
                  {isMe ? 'You' : (p.name ?? 'Player')}
                </Text>
                <Text style={styles.participantTime}>
                  {p.time_seconds !== null ? fmt(p.time_seconds) : 'DNF'}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.participantList}>
          {gc.participants.map((p) => {
            const isMe = p.user_id === userId;
            const done = p.completed_at !== null;
            return (
              <View key={p.id} style={styles.participantRow}>
                <Image
                  source={{ uri: p.avatar_url ?? 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                  style={styles.avatar}
                />
                <Text style={[styles.participantName, isMe && styles.participantNameMe]}>
                  {isMe ? 'You' : (p.name ?? 'Player')}
                </Text>
                <View style={done ? styles.statusDone : styles.statusPending}>
                  <Text style={[styles.statusText, done && styles.statusTextDone]}>
                    {done ? 'Done ✓' : 'Waiting'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {!showResults && (
        <View style={styles.actions}>
          {!iDone ? (
            <TouchableOpacity style={styles.goBtn} onPress={onAttempt}>
              <Text style={styles.goBtnText}>Go!</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.waitingBadge}>
              <Text style={styles.waitingText}>Waiting for others…</Text>
            </View>
          )}
          {isCreator && (
            <TouchableOpacity onPress={onCancel} style={styles.cancelRow}>
              <Text style={styles.cancelText}>Cancel Challenge</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// 1V1 CHALLENGE EXPANDED DETAIL

interface ChallengeDetailProps {
  c: PlayerChallenge;
  userId: string;
  todayMinutes: number;
  onRespond: (accept: boolean) => void;
  onAttempt: () => void;
  onCancel: (expired?: boolean) => void;
}

function ChallengeDetail({ c, userId, todayMinutes, onRespond, onAttempt, onCancel }: ChallengeDetailProps) {
  const isChallenger = c.challenger_id === userId;
  const opponentName = isChallenger ? c.challenged_name : c.challenger_name;
  const myTime = isChallenger ? c.challenger_time_seconds : c.challenged_time_seconds;
  const opponentTime = isChallenger ? c.challenged_time_seconds : c.challenger_time_seconds;
  const goalMet = todayMinutes >= DAILY_GOAL_MINUTES;
  const goalPct = Math.min(todayMinutes / DAILY_GOAL_MINUTES, 1);

  if (c.status === 'pending' && !isChallenger) {
    return (
      <View style={styles.detailBody}>
        <Text style={styles.detailMeta}>{c.touches_target} touches · {c.time_limit_hours}h window</Text>
        <Text style={styles.timerText}>{timeRemaining(c.expires_at)} to accept</Text>

        {!goalMet && (
          <View style={styles.nudgeBox}>
            <View style={styles.nudgeProgressRow}>
              <Text style={styles.nudgeProgressLabel}>Today's training</Text>
              <Text style={styles.nudgeProgressValue}>{todayMinutes} / {DAILY_GOAL_MINUTES} min</Text>
            </View>
            <View style={styles.nudgeTrack}>
              <View style={[styles.nudgeFill, { width: `${goalPct * 100}%` as any }]} />
            </View>
            <Text style={styles.nudgeStat}>
              Players who hit today's goal win more challenges. Train first?
            </Text>
            <TouchableOpacity
              style={styles.trainNowBtn}
              onPress={() => router.push('/(tabs)/train')}
            >
              <Text style={styles.trainNowBtnText}>Train Now</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.incomingActions}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => onRespond(true)}>
            <Text style={styles.acceptBtnText}>{goalMet ? 'Accept Challenge' : 'Accept Anyway'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={() => onRespond(false)}>
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (c.status === 'pending' && isChallenger) {
    const expired = timeRemaining(c.expires_at) === 'Expired';
    return (
      <View style={styles.detailBody}>
        <Text style={styles.detailMeta}>{c.touches_target} touches · {c.time_limit_hours}h window</Text>
        {!expired && <Text style={styles.timerText}>{timeRemaining(c.expires_at)} to accept</Text>}
        <TouchableOpacity onPress={() => onCancel(expired)} style={styles.cancelRow}>
          <Text style={styles.cancelText}>{expired ? 'Delete' : 'Cancel Challenge'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (c.status === 'accepted') {
    const iDone = myTime !== null;
    return (
      <View style={styles.detailBody}>
        <Text style={styles.detailMeta}>{c.touches_target} touches</Text>
        {c.deadline_at && (
          <Text style={styles.timerText}>{timeRemaining(c.deadline_at)} to complete</Text>
        )}
        {iDone && !opponentTime ? (
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
    );
  }

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
      <View style={styles.detailBody}>
        <Text style={[styles.resultTitle, iWon ? styles.resultTitleWin : styles.resultTitleLoss]}>
          {iWon ? 'You won!' : `${opponentName} won`}
        </Text>
        <Text style={styles.detailMeta}>{c.touches_target} touches</Text>
        <View style={styles.timesRow}>
          <View style={[styles.timeChip, iWon && styles.timeChipWin]}>
            <Text style={[styles.timeChipText, iWon && styles.timeChipTextWin]}>You {fmt(mySeconds)}</Text>
          </View>
          <View style={[styles.timeChip, !iWon && styles.timeChipWin]}>
            <Text style={[styles.timeChipText, !iWon && styles.timeChipTextWin]}>{opponentName} {fmt(theirSeconds)}</Text>
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  // Section header (plain, not a card)
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  pendingBadge: {
    backgroundColor: '#EF4444',
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
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  newBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },

  // Empty state
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
  },

  // Standalone challenge card
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardUrgent: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF8F8',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  urgentDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  cardHeaderText: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },

  // Detail content
  detailBody: {
    gap: 10,
  },
  detailMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },

  // Participants list
  participantList: {
    gap: 10,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  medal: {
    fontSize: 16,
    width: 22,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  participantName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  participantNameMe: {
    color: '#1f89ee',
  },
  participantTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
  statusPending: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDone: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  statusTextDone: {
    color: '#31af4d',
  },

  // Actions
  actions: {
    gap: 8,
    marginTop: 4,
  },
  goBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignSelf: 'flex-start',
  },
  goBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
  },
  waitingBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  waitingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
  },
  cancelRow: {
    marginTop: 2,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Incoming 1v1 actions
  nudgeBox: {
    backgroundColor: '#FFF8EC',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#FFE4A0',
  },
  nudgeProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nudgeProgressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  nudgeProgressValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  nudgeTrack: {
    height: 6,
    backgroundColor: '#FDE68A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  nudgeFill: {
    height: 6,
    backgroundColor: '#ffb724',
    borderRadius: 3,
  },
  nudgeStat: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 17,
  },
  trainNowBtn: {
    backgroundColor: '#ffb724',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  trainNowBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  incomingActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#1f89ee',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
  declineBtn: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },

  // Completed 1v1
  resultTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  resultTitleWin: {
    color: '#31af4d',
  },
  resultTitleLoss: {
    color: '#1a1a2e',
  },
  timesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  timeChipWin: {
    backgroundColor: '#D1FAE5',
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
  },
  timeChipTextWin: {
    color: '#31af4d',
  },
});
