import CheerRow from '@/components/HomePage/CheerRow';
import type { CoachChallenge } from '@/hooks/useCoachChallenges';
import type { PlayerStats } from '@/hooks/useCoachTeamPlayers';
import type { CheerData, ReactionType } from '@/hooks/useFeedCheers';
import type { DaySessionMap } from '@/hooks/useTeamDailySessions';
import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const NUDGE_COOLDOWN_MS = 6 * 60 * 60 * 1000;

interface RosterCardProps {
  player: PlayerStats;
  weekDates: string[];
  sessionMap: DaySessionMap;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCellPress: (date: string) => void;
  onLogPress: () => void;
  onEditPress: () => void;
  onChallengePress: () => void;
  onRemovePress: () => void;
  activeChallenge: CoachChallenge | undefined;
  recentCompleted: CoachChallenge | undefined;
  feedItemKey: string;
  coachId: string;
  cheerData: CheerData | undefined;
  myReaction: ReactionType | undefined;
  isPicked: boolean;
  onTogglePick: () => void;
  onNudge: () => void;
  isInactiveToday?: boolean;
}

export default function RosterCard({
  player,
  weekDates,
  sessionMap,
  isExpanded,
  onToggleExpand,
  onCellPress,
  onLogPress,
  onEditPress,
  onChallengePress,
  onRemovePress,
  activeChallenge,
  recentCompleted,
  feedItemKey,
  coachId,
  cheerData,
  myReaction,
  isPicked,
  onTogglePick,
  onNudge,
  isInactiveToday,
}: RosterCardProps) {
  const hasActiveChallenge = !!activeChallenge;

  const nudgedRecently =
    !!player.last_nudged_at && Date.now() - new Date(player.last_nudged_at).getTime() < NUDGE_COOLDOWN_MS;

  const nudgeHoursAgo = player.last_nudged_at
    ? Math.max(0, Math.round((Date.now() - new Date(player.last_nudged_at).getTime()) / (60 * 60 * 1000)))
    : null;

  return (
    <View style={[styles.card, isInactiveToday && styles.cardMuted]}>
      <TouchableOpacity style={styles.header} onPress={onToggleExpand} activeOpacity={0.7}>
        <Image
          source={{
            uri: player.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
          }}
          style={[
            styles.avatar,
            player.today_touches > 0 && styles.avatarActive,
            isInactiveToday && styles.avatarMuted,
          ]}
        />

        <View style={styles.info}>
          <Text style={[styles.name, isInactiveToday && styles.nameMuted]} numberOfLines={1}>
            {player.display_name || player.name || 'Player'}
          </Text>
          <View style={styles.weekPips}>
            {weekDates.map((date) => {
              const touches = sessionMap[player.id]?.[date]?.touches ?? 0;
              return (
                <TouchableOpacity key={date} onPress={() => onCellPress(date)} hitSlop={4}>
                  <View
                    style={[
                      styles.pip,
                      touches >= player.daily_target
                        ? styles.pipHit
                        : touches > 0
                        ? styles.pipTrained
                        : styles.pipEmpty,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.weekTouches}>{player.week_touches.toLocaleString()}</Text>
          <View style={styles.todayRow}>
            <Ionicons name="football" size={11} color={player.today_touches > 0 ? '#31af4d' : '#B0BEC5'} />
            <Text style={[styles.todayTouches, player.today_touches > 0 && styles.todayTouchesActive]}>
              {player.today_touches.toLocaleString()} today
            </Text>
          </View>
          {player.current_streak > 0 && <Text style={styles.streakText}>🔥 {player.current_streak}</Text>}
        </View>

        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
      </TouchableOpacity>

      {/* Action toolbar — Cheer stays outside the ScrollView since its
          reaction picker pops up via absolute positioning and would get
          clipped by the ScrollView's overflow bounds otherwise. */}
      <View style={styles.actionRow}>
        <CheerRow
          feedItemKey={feedItemKey}
          recipientId={player.id}
          userId={coachId}
          cheerData={cheerData}
          myReaction={myReaction}
          label="Cheer"
          containerStyle={styles.cheerRowContainer}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollablePills}
        >
          <TouchableOpacity
            style={[styles.pillBtn, isPicked && styles.pillBtnActive]}
            onPress={onTogglePick}
            hitSlop={6}
          >
            <Ionicons name={isPicked ? 'star' : 'star-outline'} size={14} color={isPicked ? '#D97706' : '#78909C'} />
            <Text style={[styles.pillBtnText, isPicked && styles.pillBtnTextActive]}>Star</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pillBtn, nudgedRecently && styles.pillBtnDisabled]}
            onPress={onNudge}
            disabled={nudgedRecently}
            hitSlop={6}
          >
            <Ionicons name="notifications-outline" size={14} color={nudgedRecently ? '#D1D5DB' : '#78909C'} />
            <Text style={[styles.pillBtnText, nudgedRecently && styles.pillBtnTextMuted]}>Nudge</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      {nudgedRecently && nudgeHoursAgo !== null && (
        <Text style={styles.nudgeHint}>Nudged {nudgeHoursAgo === 0 ? 'just now' : `${nudgeHoursAgo}h ago`}</Text>
      )}

      {isExpanded && (
        <View style={styles.expandedRow}>
          <View style={styles.statChips}>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>Today</Text>
              <Text style={styles.statChipValue}>{player.today_touches.toLocaleString()}</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>Yesterday</Text>
              <Text style={styles.statChipValue}>{player.yesterday_touches.toLocaleString()}</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>This Week</Text>
              <Text style={styles.statChipValue}>{player.week_touches.toLocaleString()}</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statChipLabel}>Game Speed</Text>
              <Text style={styles.statChipValue}>{player.game_speed_pct}%</Text>
            </View>
          </View>

          {activeChallenge && (
            <View style={styles.challengeStrip}>
              <Ionicons name="flag" size={13} color="#D97706" />
              <Text style={styles.challengeStripText}>
                {activeChallenge.accepted_at
                  ? `🏃 ${activeChallenge.touches_target.toLocaleString()} touches — in progress · due ${activeChallenge.due_date}`
                  : `⏳ ${activeChallenge.touches_target.toLocaleString()} touches — pending accept · due ${activeChallenge.due_date}`}
              </Text>
            </View>
          )}
          {!activeChallenge && recentCompleted && (
            <View style={[styles.challengeStrip, styles.challengeStripDone]}>
              <Ionicons name="checkmark-circle" size={13} color="#31af4d" />
              <Text style={[styles.challengeStripText, styles.challengeStripTextDone]}>
                ✅ {recentCompleted.touches_target.toLocaleString()} touches — completed{' '}
                {new Date(recentCompleted.completed_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          )}

          <View style={styles.expandedActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={onLogPress}>
              <Ionicons name="add-circle-outline" size={15} color="#1f89ee" />
              <Text style={styles.actionBtnText}>Log</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={onEditPress}>
              <Ionicons name="pencil-outline" size={15} color="#1f89ee" />
              <Text style={styles.actionBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, hasActiveChallenge && styles.actionBtnDisabled]}
              onPress={onChallengePress}
            >
              <Ionicons name="flag-outline" size={15} color={hasActiveChallenge ? '#B0BEC5' : '#1f89ee'} />
              <Text style={[styles.actionBtnText, hasActiveChallenge && styles.actionBtnTextDisabled]}>
                Challenge
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={onRemovePress}>
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
              <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 6,
  },
  cardMuted: {
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  avatarActive: {
    borderColor: '#31af4d',
  },
  avatarMuted: {
    opacity: 0.5,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  nameMuted: {
    color: '#9CA3AF',
  },
  weekPips: {
    flexDirection: 'row',
    gap: 3,
  },
  pip: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pipEmpty: {
    backgroundColor: '#E5E7EB',
  },
  pipTrained: {
    backgroundColor: '#A7DEB5',
  },
  pipHit: {
    backgroundColor: '#31af4d',
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  weekTouches: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1f89ee',
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  todayTouches: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B0BEC5',
  },
  todayTouchesActive: {
    color: '#31af4d',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  scrollablePills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cheerRowContainer: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#B0BEC5',
  },
  pillBtnActive: {
    borderColor: '#ffb724',
    backgroundColor: '#FFF7E6',
  },
  pillBtnDisabled: {
    opacity: 0.5,
  },
  pillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78909C',
  },
  pillBtnTextActive: {
    color: '#D97706',
  },
  pillBtnTextMuted: {
    color: '#D1D5DB',
  },
  nudgeHint: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B0BEC5',
    textAlign: 'right',
    marginBottom: 4,
  },

  // Expanded stats
  expandedRow: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 10,
  },
  statChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78909C',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statChipValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  expandedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#EBF4FF',
    borderRadius: 10,
    paddingVertical: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },
  actionBtnDanger: {
    backgroundColor: '#FEF2F2',
  },
  actionBtnTextDanger: {
    color: '#EF4444',
  },
  actionBtnDisabled: {
    backgroundColor: '#F3F4F6',
  },
  actionBtnTextDisabled: {
    color: '#B0BEC5',
  },
  challengeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },
  challengeStripDone: {
    backgroundColor: '#DCFCE7',
  },
  challengeStripText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    flex: 1,
  },
  challengeStripTextDone: {
    color: '#16a34a',
  },
});
