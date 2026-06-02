import ChallengeAttemptModal from '@/components/modals/ChallengeAttemptModal';
import ChallengeSetupModal from '@/components/modals/ChallengeSetupModal';
import TeammatePickerModal, { type Teammate } from '@/components/modals/TeammatePickerModal';
import { useAcceptCoachChallenge, useCancelCoachChallenge, useCompleteCoachChallenge, usePlayerCoachChallenges } from '@/hooks/useCoachChallenges';
import { type GroupChallenge, useDeleteGroupChallenge, useGroupChallenges } from '@/hooks/useGroupChallenges';
import {
  useCancelPlayerChallenge,
  usePlayerChallenges,
  useRespondToChallenge,
  type PlayerChallenge,
} from '@/hooks/usePlayerChallenges';
import { Ionicons } from '@expo/vector-icons';
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
  mode?: 'all' | 'competitive' | 'coach';
}

export default function ChallengesCard({ userId, teamId, playerName, mode = 'all' }: ChallengesCardProps) {
  const { data: challenges = [] } = usePlayerChallenges(userId);
  const { data: coachChallenges = [] } = usePlayerCoachChallenges(userId);
  const { data: groupChallenges = [] } = useGroupChallenges(userId);
  const { mutate: respond } = useRespondToChallenge();
  const { mutate: cancelPlayer } = useCancelPlayerChallenge();
  const { mutate: cancelCoach } = useCancelCoachChallenge();
  const { mutate: acceptCoach } = useAcceptCoachChallenge();
  const { mutate: completeCoach } = useCompleteCoachChallenge();
  const { mutate: deleteGroup } = useDeleteGroupChallenge();

  const [expanded, setExpanded] = useState(false);
  const [attemptChallenge, setAttemptChallenge] = useState<PlayerChallenge | null>(null);
  const [attemptGroupChallenge, setAttemptGroupChallenge] = useState<GroupChallenge | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [challengedPlayers, setChallengedPlayers] = useState<Teammate[]>([]);

  const pendingCount = challenges.filter(
    (c) => c.status === 'pending' && c.challenged_id === userId,
  ).length;
  const activeCoachChallenges = coachChallenges.filter((c) => c.status === 'active');
  const hasUnstartedGroupChallenge = groupChallenges.some((gc) => {
    const deadlinePassed = new Date() > new Date(gc.deadline_at);
    const allDone = gc.participants.every((p) => p.completed_at !== null);
    const me = gc.participants.find((p) => p.user_id === userId);
    return !deadlinePassed && !allDone && me?.completed_at === null;
  });

  const activeChallenges = challenges.filter((c) => c.status !== 'completed');

  // Filter by mode
  const showPlayerGroup = mode !== 'coach';
  const showCoach = mode !== 'competitive';

  // Top-priority challenge to always show: pending incoming > group > coach > outgoing
  const topChallenge = (() => {
    if (showPlayerGroup) {
      const incomingPending = challenges.find((c) => c.status === 'pending' && c.challenged_id === userId);
      if (incomingPending) return { type: 'player' as const, item: incomingPending };
      const activeGroup = groupChallenges.find((gc) => {
        const deadlinePassed = new Date() > new Date(gc.deadline_at);
        const allDone = gc.participants.every((p) => p.completed_at !== null);
        const me = gc.participants.find((p) => p.user_id === userId);
        return !deadlinePassed && !allDone && me?.completed_at === null;
      });
      if (activeGroup) return { type: 'group' as const, item: activeGroup };
    }
    if (showCoach && activeCoachChallenges.length > 0) return { type: 'coach' as const, item: activeCoachChallenges[0] };
    if (showPlayerGroup) {
      const outgoing = activeChallenges.find((c) => c.status === 'pending' && c.challenger_id === userId);
      if (outgoing) return { type: 'player' as const, item: outgoing };
      const active1v1 = activeChallenges.find((c) => c.status === 'accepted');
      if (active1v1) return { type: 'player' as const, item: active1v1 };
    }
    return null;
  })();

  const visibleActive =
    (showPlayerGroup ? activeChallenges.length : 0) +
    (showCoach ? activeCoachChallenges.length : 0) +
    (showPlayerGroup ? groupChallenges.filter((gc) => new Date() < new Date(gc.deadline_at)).length : 0);
  const extraCount = Math.max(0, visibleActive - (topChallenge ? 1 : 0));

  return (
    <>
      <View style={[styles.container, (pendingCount > 0 || activeCoachChallenges.length > 0 || hasUnstartedGroupChallenge) && styles.containerAlert]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{mode === 'coach' ? 'Coach Challenges' : 'Teammate Challenges'}</Text>
            {pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            {teamId && (
              <TouchableOpacity
                style={styles.newChallengeBtn}
                onPress={() => setShowPicker(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name='add' size={16} color='#1f89ee' />
                <Text style={styles.newChallengeBtnText}>New</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setExpanded((v) => !v)} hitSlop={12}>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color='#78909C' />
            </TouchableOpacity>
          </View>
        </View>

        {/* Always-visible top challenge — only show if there's something active */}
        {!expanded && topChallenge !== null && <View style={styles.rows}>
          {topChallenge?.type === 'group' && (
            <GroupChallengeCard
              challenge={topChallenge.item as GroupChallenge}
              userId={userId}
              onAttempt={() => setAttemptGroupChallenge(topChallenge.item as GroupChallenge)}
              onCancel={() =>
                Alert.alert('Cancel Group Challenge?', 'This will remove the challenge for everyone.', [
                  { text: 'Keep', style: 'cancel' },
                  { text: 'Cancel', style: 'destructive', onPress: () => deleteGroup({ groupChallengeId: (topChallenge.item as GroupChallenge).id, userId }) },
                ])
              }
            />
          )}
          {topChallenge?.type === 'coach' && (
            <View style={styles.coachSection}>
              <Text style={styles.coachSectionLabel}>Coach Challenge</Text>
              {(() => {
                const c = topChallenge.item as typeof activeCoachChallenges[0];
                return (
                  <View style={styles.coachRow}>
                    <View style={styles.coachRowLeft}>
                      <Text style={styles.coachRowTarget}>{c.touches_target.toLocaleString()} touches</Text>
                      <Text style={styles.coachRowDetail}>Due {c.due_date}</Text>
                      <View style={styles.coachStatusRow}>
                        <View style={styles.coachBadge}>
                          <Text style={styles.coachBadgeText}>{c.accepted_at ? '🏃 In Progress' : '🎯 Coach Challenge'}</Text>
                        </View>
                      </View>
                      <View style={styles.coachRowActions}>
                        {!c.accepted_at ? (
                          <TouchableOpacity style={styles.coachInlineBtn} onPress={() => acceptCoach({ challengeId: c.id, coachId: c.coach_id, playerId: c.player_id, playerName, coachPushToken: c.coach_push_token }, { onError: (err) => Alert.alert('Error', err instanceof Error ? err.message : 'Failed') })}>
                            <Text style={styles.coachInlineBtnText}>Accept</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity style={[styles.coachInlineBtn, styles.coachInlineBtnGreen]} onPress={() => Alert.alert('Mark as Complete?', `Confirm you've completed ${c.touches_target.toLocaleString()} touches.`, [{ text: 'Not yet', style: 'cancel' }, { text: 'Complete!', onPress: () => completeCoach({ challengeId: c.id, coachId: c.coach_id, playerId: c.player_id, playerName, touchesTarget: c.touches_target, coachPushToken: c.coach_push_token }) }])}>
                            <Text style={[styles.coachInlineBtnText, styles.coachInlineBtnTextGreen]}>Done</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => Alert.alert('Cancel Challenge?', 'This will remove the challenge.', [{ text: 'Keep', style: 'cancel' }, { text: 'Cancel', style: 'destructive', onPress: () => cancelCoach({ challengeId: c.id, coachId: c.coach_id, playerId: c.player_id }) }])}>
                          <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })()}
            </View>
          )}
          {topChallenge?.type === 'player' && (
            <ChallengeRow
              challenge={topChallenge.item as PlayerChallenge}
              userId={userId}
              onRespond={(accept) => respond({ challengeId: (topChallenge.item as PlayerChallenge).id, accept, timeLimitHours: (topChallenge.item as PlayerChallenge).time_limit_hours, challengerId: (topChallenge.item as PlayerChallenge).challenger_id, responderId: userId, responderName: (topChallenge.item as PlayerChallenge).challenged_name ?? '', challengerPushToken: (topChallenge.item as PlayerChallenge).challenger_push_token ?? null })}
              onAttempt={() => setAttemptChallenge(topChallenge.item as PlayerChallenge)}
              onCancel={(expired) => Alert.alert(expired ? 'Delete Challenge?' : 'Cancel Challenge?', expired ? 'This will remove the expired challenge.' : 'This will remove the challenge for both players.', [{ text: 'Keep', style: 'cancel' }, { text: expired ? 'Delete' : 'Cancel Challenge', style: 'destructive', onPress: () => cancelPlayer({ challengeId: (topChallenge.item as PlayerChallenge).id }) }])}
            />
          )}
          {extraCount > 0 && (
            <TouchableOpacity style={styles.moreRow} onPress={() => setExpanded(true)}>
              <Text style={styles.moreText}>+{extraCount} more challenge{extraCount !== 1 ? 's' : ''} — tap to expand</Text>
            </TouchableOpacity>
          )}
        </View>}

        {/* Full expanded view */}
        {expanded && <View style={styles.rows}>
          {/* Coach-assigned challenges */}
          {showCoach && activeCoachChallenges.length > 0 && (
            <View style={styles.coachSection}>
              <Text style={styles.coachSectionLabel}>Coach Challenges</Text>
              {activeCoachChallenges.map((c) => (
                <View key={c.id} style={styles.coachRow}>
                  <View style={styles.coachRowLeft}>
                    <Text style={styles.coachRowTarget}>{c.touches_target.toLocaleString()} touches</Text>
                    <Text style={styles.coachRowDetail}>Due {c.due_date}</Text>
                    <View style={styles.coachStatusRow}>
                      <View style={styles.coachBadge}>
                        <Text style={styles.coachBadgeText}>
                          {c.accepted_at ? '🏃 In Progress' : '🎯 Coach Challenge'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.coachRowActions}>
                        {!c.accepted_at ? (
                          <TouchableOpacity
                            style={styles.coachInlineBtn}
                            onPress={() => {
                              acceptCoach(
                                {
                                  challengeId: c.id,
                                  coachId: c.coach_id,
                                  playerId: c.player_id,
                                  playerName,
                                  coachPushToken: c.coach_push_token,
                                },
                                {
                                  onError: (err) =>
                                    Alert.alert('Error', err instanceof Error ? err.message : 'Failed to accept challenge'),
                                },
                              );
                            }}
                          >
                            <Text style={styles.coachInlineBtnText}>Accept</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.coachInlineBtn, styles.coachInlineBtnGreen]}
                            onPress={() =>
                              Alert.alert(
                                'Mark as Complete?',
                                `Confirm you've completed ${c.touches_target.toLocaleString()} touches.`,
                                [
                                  { text: 'Not yet', style: 'cancel' },
                                  {
                                    text: 'Complete!',
                                    onPress: () =>
                                      completeCoach({
                                        challengeId: c.id,
                                        coachId: c.coach_id,
                                        playerId: c.player_id,
                                        playerName,
                                        touchesTarget: c.touches_target,
                                        coachPushToken: c.coach_push_token,
                                      }),
                                  },
                                ],
                              )
                            }
                          >
                            <Text style={[styles.coachInlineBtnText, styles.coachInlineBtnTextGreen]}>Done</Text>
                          </TouchableOpacity>
                        )}
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
          {topChallenge === null && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {teamId ? 'No current challenges' : 'Join a team to challenge teammates'}
              </Text>
            </View>
          )}
          {showPlayerGroup && groupChallenges.filter((gc) => {
            const allDone = gc.participants.every((p) => p.completed_at !== null);
            const deadlinePassed = new Date() > new Date(gc.deadline_at);
            return !allDone && !deadlinePassed;
          }).map((gc) => (
            <GroupChallengeCard
              key={gc.id}
              challenge={gc}
              userId={userId}
              onAttempt={() => setAttemptGroupChallenge(gc)}
              onCancel={() =>
                Alert.alert('Cancel Group Challenge?', 'This will remove the challenge for everyone.', [
                  { text: 'Keep', style: 'cancel' },
                  {
                    text: 'Cancel',
                    style: 'destructive',
                    onPress: () => deleteGroup({ groupChallengeId: gc.id, userId }),
                  },
                ])
              }
            />
          ))}
          {showPlayerGroup && activeChallenges.map((c) => (
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
          onSuccess={() => setExpanded(true)}
          creatorId={userId}
          creatorName={playerName}
          teamId={teamId}
          participants={challengedPlayers}
        />
      )}
    </>
  );
}

// GROUP CHALLENGE CARD — visible to all participants

interface GroupChallengeCardProps {
  challenge: GroupChallenge;
  userId: string;
  onAttempt: () => void;
  onCancel: () => void;
}

function GroupChallengeCard({ challenge: gc, userId, onAttempt, onCancel }: GroupChallengeCardProps) {
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

  const creatorParticipant = gc.participants.find((p) => p.user_id === gc.created_by);
  const creatorName = gc.created_by === userId ? 'You' : (creatorParticipant?.name ?? 'Someone');

  const medals = ['🥇', '🥈', '🥉'];

  const rankedParticipants = showResults
    ? [...gc.participants].sort((a, b) => {
        if (a.time_seconds === null) return 1;
        if (b.time_seconds === null) return -1;
        return a.time_seconds - b.time_seconds;
      })
    : null;

  const needsAction = !iDone && !showResults;

  return (
    <View style={[styles.groupRow, needsAction && styles.groupRowActive]}>
      <View style={styles.groupHeader}>
        <View style={styles.groupHeaderLeft}>
          <Text style={styles.groupTitle}>⚔️ Group Challenge</Text>
          <Text style={styles.groupMeta}>
            {gc.participants.length} players · {gc.touches_target} touches · by {creatorName}
          </Text>
        </View>
        {!showResults && (
          <Text style={styles.groupDeadline}>{timeRemaining(gc.deadline_at)}</Text>
        )}
      </View>

      {showResults && rankedParticipants ? (
        <View style={styles.groupResults}>
          {rankedParticipants.map((p, i) => {
            const isMe = p.user_id === userId;
            return (
              <View key={p.id} style={[styles.groupResultRow, isMe && styles.groupResultRowMe]}>
                <Text style={styles.groupMedal}>{medals[i] ?? '·'}</Text>
                <Image
                  source={{ uri: p.avatar_url ?? 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                  style={styles.groupAvatar}
                />
                <Text style={[styles.groupResultName, isMe && styles.groupResultNameMe]}>
                  {isMe ? 'You' : (p.name ?? 'Player')}
                </Text>
                <Text style={styles.groupResultTime}>
                  {p.time_seconds !== null ? fmt(p.time_seconds) : 'DNF'}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.groupParticipants}>
          {gc.participants.map((p) => {
            const isMe = p.user_id === userId;
            const done = p.completed_at !== null;
            return (
              <View key={p.id} style={styles.groupParticipantRow}>
                <Image
                  source={{ uri: p.avatar_url ?? 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                  style={styles.groupAvatar}
                />
                <Text style={[styles.groupParticipantName, isMe && styles.groupParticipantNameMe]}>
                  {isMe ? 'You' : (p.name ?? 'Player')}
                </Text>
                <View style={done ? styles.groupStatusDone : styles.groupStatusPending}>
                  <Text style={styles.groupStatusText}>{done ? 'Done ✓' : 'Not started'}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {!showResults && (
        <View style={styles.groupActions}>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  newChallengeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EBF4FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  newChallengeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f89ee',
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

  moreRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
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
  coachRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  coachInlineBtn: {
    borderWidth: 1.5,
    borderColor: '#1f89ee',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  coachInlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f89ee',
  },
  coachInlineBtnGreen: {
    borderColor: '#31af4d',
  },
  coachInlineBtnTextGreen: {
    color: '#31af4d',
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

  // GROUP CHALLENGE CARD
  groupRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    padding: 14,
    gap: 10,
  },
  groupRowActive: {
    backgroundColor: '#FFFBEB',
    borderBottomColor: '#FDE68A',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  groupHeaderLeft: {
    gap: 2,
    flex: 1,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  groupMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  groupDeadline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78909C',
  },
  groupParticipants: {
    gap: 8,
  },
  groupParticipantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  groupParticipantName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  groupParticipantNameMe: {
    color: '#1f89ee',
  },
  groupStatusPending: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  groupStatusDone: {
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  groupStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  groupActions: {
    gap: 6,
  },
  groupResults: {
    gap: 6,
  },
  groupResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  groupResultRowMe: {},
  groupMedal: {
    fontSize: 16,
    width: 24,
  },
  groupResultName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  groupResultNameMe: {
    color: '#1f89ee',
  },
  groupResultTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
});
