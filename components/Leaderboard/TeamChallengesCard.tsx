import { type TeamAccountabilityChallenge, type TeamAccountabilityPlayer } from '@/hooks/useTeamAccountability';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function PlayerRow({
  player,
  challengeId,
}: {
  player: TeamAccountabilityPlayer;
  challengeId: string;
}) {
  const done = (() => {
    if (challengeId === 'mission_squad') return player.todayMissionComplete;
    if (challengeId === 'touch_goal') return player.dailyTouchGoalComplete;
    if (challengeId === 'streak_squad') return player.threeDayStreakComplete;
    if (challengeId === 'weekly_missions') return player.weeklyMissionComplete;
    return false;
  })();

  const detail = (() => {
    if (challengeId === 'touch_goal') return player.todayTouches.toLocaleString();
    if (challengeId === 'streak_squad') return `${player.threeDayStreakCount}/3`;
    if (challengeId === 'weekly_missions') return `${player.weeklyMissionCount}/${player.weeklyMissionGoal}`;
    return null;
  })();

  const initials = player.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.playerRow}>
      <View style={styles.playerLeft}>
        {player.avatarUrl ? (
          <Image source={{ uri: player.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <Text style={[styles.playerName, done && styles.playerNameDone]} numberOfLines={1}>
          {player.displayName}
        </Text>
      </View>

      <View style={styles.playerRight}>
        {detail && (
          <Text style={[styles.playerDetail, done && styles.playerDetailDone]}>{detail}</Text>
        )}
        {done ? (
          <Ionicons name='checkmark-circle' size={18} color='#31af4d' />
        ) : (
          <Ionicons name='ellipse-outline' size={18} color='#C4C9D4' />
        )}
      </View>
    </View>
  );
}

function ChallengeBlock({ challenge }: { challenge: TeamAccountabilityChallenge }) {
  const pct = challenge.totalCount > 0
    ? Math.round((challenge.completedCount / challenge.totalCount) * 100)
    : 0;
  const allDone = challenge.completedCount === challenge.totalCount;

  return (
    <View style={[styles.challengeBlock, allDone && styles.challengeBlockDone]}>
      <View style={styles.challengeBlockHeader}>
        <View style={styles.challengeBlockLeft}>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
          <Text style={styles.challengeSubtitle}>{challenge.subtitle}</Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={[styles.progressBadgeText, allDone && styles.progressBadgeTextDone]}>
            {challenge.completedCount}/{challenge.totalCount}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }, allDone && styles.progressFillDone]} />
      </View>

      {challenge.players.map((player) => (
        <PlayerRow key={player.userId} player={player} challengeId={challenge.id} />
      ))}

      {!allDone && (
        <Text style={styles.waitingText}>
          Waiting on {challenge.totalCount - challenge.completedCount} teammate
          {challenge.totalCount - challenge.completedCount !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
}

interface TeamChallengesCardProps {
  challenges: TeamAccountabilityChallenge[];
}

export default function TeamChallengesCard({ challenges }: TeamChallengesCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (challenges.length === 0) return null;

  const completedCount = challenges.filter((c) => c.completedCount === c.totalCount).length;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded((p) => !p)}
        activeOpacity={0.7}
      >
        <View>
          <Text style={styles.cardTitle}>Team Challenges</Text>
          <Text style={styles.cardSubtitle}>
            {completedCount}/{challenges.length} complete
          </Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color='#78909C' />
      </TouchableOpacity>

      {expanded && challenges.map((c, i) => (
        <View key={c.id} style={i > 0 ? styles.restChallenge : undefined}>
          <ChallengeBlock challenge={c} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  challengeBlock: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  challengeBlockDone: {
    backgroundColor: '#F0FDF4',
  },
  challengeBlockHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  challengeBlockLeft: {
    flex: 1,
    marginRight: 8,
  },
  challengeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 1,
  },
  challengeSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
  progressBadge: {
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78909C',
  },
  progressBadgeTextDone: {
    color: '#31af4d',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#F0F2F5',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1f89ee',
    borderRadius: 2,
  },
  progressFillDone: {
    backgroundColor: '#31af4d',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  playerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  avatarFallback: {
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
  },
  playerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
    flex: 1,
  },
  playerNameDone: {
    color: '#78909C',
  },
  playerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerDetail: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
  },
  playerDetailDone: {
    color: '#31af4d',
  },
  waitingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 4,
    fontStyle: 'italic',
  },
  restChallenge: {
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
  },
});
