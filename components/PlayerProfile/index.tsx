import BadgeGrid from '@/components/common/BadgeGrid';
import SessionRow from '@/components/common/SessionRow';
import ChallengeSetupModal from '@/components/modals/ChallengeSetupModal';
import ActivityHeatmap from '@/components/ProgressPage/ActivityHeatmap';
import { useAllBadges, useUserBadges } from '@/hooks/useBadges';
import { useProfile } from '@/hooks/useProfile';
import {
  useActiveStreak,
  useHeatmapCells,
  useJugglingRecord,
  useRecentSessions,
  useTouchTracking,
} from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { getLevelFromXp, getRankName } from '@/lib/xp';
import { getGlobalDisplayName } from '@/utils/globalLeaderboardName';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png';
const PAGE_SIZE = 20;

export default function PlayerProfile({ playerId }: { playerId: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sessionLimit, setSessionLimit] = useState(PAGE_SIZE);
  const [challengeSetupVisible, setChallengeSetupVisible] = useState(false);

  const { data: currentUser } = useUser();
  const { data: currentUserProfile } = useProfile(currentUser?.id);
  const { data: profile } = useProfile(playerId);
  const { data: touchStats } = useTouchTracking(playerId);
  const { data: activeStreakStats } = useActiveStreak(playerId);
  const { data: jugglePB = 0 } = useJugglingRecord(playerId);
  const { data: heatmapCells = [] } = useHeatmapCells(playerId);
  // Full profile (real name, team, session history) is only for people who
  // already share a team or club with the player, or coach them. Anyone else
  // (e.g. tapping through from the global leaderboard) gets the public view.
  const isSelf = currentUser?.id === playerId;
  const isConnected =
    isSelf ||
    (!!profile?.team_id && profile.team_id === currentUserProfile?.team_id) ||
    (!!profile?.club_id && profile.club_id === currentUserProfile?.club_id) ||
    (!!currentUser && profile?.teams?.coach_id === currentUser.id);

  const { data: sessions = [], isFetching: sessionsFetching } = useRecentSessions(
    isConnected ? playerId : undefined,
    sessionLimit,
  );
  const { data: allBadges = [] } = useAllBadges();
  const { data: userBadges = [] } = useUserBadges(playerId);

  const earnedBadgeIds = new Set(userBadges.map((b) => b.badge_id));
  const { level } = getLevelFromXp(profile?.total_xp ?? 0);
  const rank = getRankName(level);
  const fullName = profile?.display_name || profile?.name || 'Player';
  const name = isConnected ? fullName : getGlobalDisplayName(fullName);
  const canChallenge =
    !!currentUser &&
    !isSelf &&
    isConnected &&
    !currentUserProfile?.is_coach &&
    !!currentUserProfile?.team_id;
  const totalSessions = touchStats?.total_sessions ?? 0;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name='chevron-back' size={24} color='#1a1a2e' />
        </TouchableOpacity>
      </View>

      {!profile ? (
        <ActivityIndicator style={styles.loader} color='#1f89ee' />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Image source={{ uri: profile.avatar_url || FALLBACK_AVATAR }} style={styles.avatar} />
            <View style={styles.headerInfo}>
              <Text style={styles.name} numberOfLines={2}>
                {name}
              </Text>
              <Text style={styles.subtitle}>
                {totalSessions.toLocaleString()} {totalSessions === 1 ? 'session' : 'sessions'}
                {isConnected && profile.teams?.name ? ` · ${profile.teams.name}` : ''}
              </Text>
              <View style={styles.rankPill}>
                <Text style={styles.rankText}>
                  Level {level} · {rank}
                </Text>
              </View>
            </View>
          </View>

          {/* STATS */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {(touchStats?.total_touches ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Touches</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {(touchStats?.this_week_touches ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{activeStreakStats?.currentStreak ?? 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{jugglePB}</Text>
              <Text style={styles.statLabel}>Juggle PB</Text>
            </View>
          </View>

          {canChallenge && (
            <TouchableOpacity
              style={styles.challengeButton}
              onPress={() => setChallengeSetupVisible(true)}
            >
              <Text style={styles.challengeButtonText}>⚔️ Challenge {name}</Text>
            </TouchableOpacity>
          )}

          {/* CONSISTENCY */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Consistency</Text>
            <ActivityHeatmap cells={heatmapCells} />
          </View>

          {/* ACTIVITY */}
          {isConnected && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Activity</Text>
              {sessions.length === 0 && !sessionsFetching ? (
                <Text style={styles.emptyText}>No sessions logged yet</Text>
              ) : (
                sessions.map((session) => <SessionRow key={session.id} session={session} />)
              )}
              {sessions.length >= sessionLimit && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setSessionLimit((n) => n + PAGE_SIZE)}
                  disabled={sessionsFetching}
                >
                  {sessionsFetching ? (
                    <ActivityIndicator size='small' color='#1f89ee' />
                  ) : (
                    <Text style={styles.showMoreText}>Show more</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* BADGES */}
          <View style={styles.card}>
            <View style={styles.badgesHeader}>
              <Text style={styles.cardTitle}>Badges</Text>
              <Text style={styles.badgesCount}>
                {earnedBadgeIds.size}/{allBadges.length}
              </Text>
            </View>
            <BadgeGrid allBadges={allBadges} earnedIds={earnedBadgeIds} compact />
          </View>
        </ScrollView>
      )}

      {canChallenge && challengeSetupVisible && currentUserProfile?.team_id && (
        <ChallengeSetupModal
          visible={challengeSetupVisible}
          onClose={() => setChallengeSetupVisible(false)}
          creatorId={currentUser!.id}
          creatorName={currentUserProfile.display_name || currentUserProfile.name || 'Someone'}
          teamId={currentUserProfile.team_id}
          participants={[{ id: playerId, name, push_token: null }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginTop: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#1f89ee',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
  },
  rankPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f89ee',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  challengeButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  challengeButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    paddingVertical: 16,
  },
  showMoreButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f89ee',
  },
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  badgesCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
});
