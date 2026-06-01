import { useTeamBadges } from '@/hooks/useTeamBadges';
import { useTeam } from '@/hooks/useTeam';
import { useUser } from '@/hooks/useUser';
import { getWeeklyChallengeStatus, WeeklyChallengeStatus } from '@/lib/checkTeamBadges';
import { getCurrentWeekChallenge, WEEKLY_CHALLENGES } from '@/lib/teamBadges';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatWeek(weekStart: string) {
  return new Date(weekStart + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function metricLabel(status: WeeklyChallengeStatus, value: number): string {
  switch (status.challenge.metric) {
    case 'week_touches':
    case 'all_in_plus_touches':
      return value.toLocaleString();
    case 'training_days':
      return `${value}d`;
    case 'week_sessions':
      return `${value}x`;
    case 'streak_days':
      return `${value}🔥`;
    case 'has_juggled':
      return value ? '✓' : '–';
    default:
      return String(value);
  }
}

function playerBarMax(status: WeeklyChallengeStatus): number {
  switch (status.challenge.metric) {
    case 'week_touches':
    case 'all_in_plus_touches':
      return status.challenge.touchTarget ?? status.challenge.target;
    case 'training_days':
    case 'week_sessions':
    case 'streak_days':
      return status.challenge.target;
    case 'has_juggled':
      return 1;
    default:
      return status.challenge.target;
  }
}

export default function TeamBadgesScreen() {
  const insets = useSafeAreaInsets();
  const { data: user } = useUser();
  const { data: team } = useTeam(user?.id);
  const { data: earnedBadges = [], isLoading: badgesLoading } = useTeamBadges(team?.id);

  const { data: status, isLoading: statusLoading } = useQuery<WeeklyChallengeStatus | null>({
    queryKey: ['weekly-challenge-status', team?.id],
    enabled: !!team?.id,
    staleTime: 1000 * 60,
    queryFn: () => getWeeklyChallengeStatus(team!.id),
  });

  const isLoading = badgesLoading || statusLoading;
  const challenge = status?.challenge ?? getCurrentWeekChallenge();
  const thisWeekEarned = status?.alreadyAwarded ?? false;
  const pct = status ? Math.min(status.qualifiedCount / status.required, 1) : 0;
  const barMax = status ? playerBarMax(status) : challenge.target;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name='close' size={26} color='#1a1a2e' />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Team Badges</Text>
          {earnedBadges.length > 0 && (
            <Text style={styles.subtitle}>{earnedBadges.length} badge{earnedBadges.length !== 1 ? 's' : ''} earned</Text>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size='large' color='#1f89ee' />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* THIS WEEK'S CHALLENGE */}
          <Text style={styles.sectionLabel}>This Week's Challenge</Text>

          <View style={[styles.challengeCard, thisWeekEarned && { borderColor: challenge.color, borderWidth: 2 }]}>
            <View style={styles.challengeTop}>
              <Text style={styles.challengeIcon}>{challenge.icon}</Text>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeName}>{challenge.name}</Text>
                <Text style={styles.challengeDesc}>{challenge.description}</Text>
              </View>
              {thisWeekEarned && (
                <View style={[styles.earnedPill, { backgroundColor: challenge.color + '22' }]}>
                  <Text style={[styles.earnedPillText, { color: challenge.color }]}>Earned ✓</Text>
                </View>
              )}
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={['#1f89ee', '#ffb724']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${pct * 100}%` as any }]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {status
                  ? thisWeekEarned
                    ? `Nailed it! ${status.qualifiedCount}/${status.playerCount} players qualified 🎉`
                    : `${status.qualifiedCount} of ${status.required} players qualified`
                  : 'Loading…'}
              </Text>
              {status && !thisWeekEarned && status.playersNeeded > 0 && (
                <Text style={[styles.progressNeeded, { color: challenge.color }]}>
                  {status.playersNeeded} more teammate{status.playersNeeded !== 1 ? 's' : ''} needed
                </Text>
              )}
            </View>

            {status && status.players.length > 0 && (
              <View style={styles.playerList}>
                {status.players.map((p) => {
                  const rawPct = Math.min(p.value / barMax, 1);
                  return (
                    <View key={p.id} style={styles.playerRow}>
                      <Text style={styles.playerName} numberOfLines={1}>{p.name}</Text>
                      <View style={styles.playerBarTrack}>
                        <View style={[styles.playerBarFill, {
                          width: `${rawPct * 100}%` as any,
                          backgroundColor: p.qualified ? '#31af4d' : '#1f89ee',
                        }]} />
                      </View>
                      <Text style={[styles.playerValue, p.qualified && styles.playerValueQualified]}>
                        {p.qualified ? '✓' : metricLabel(status, p.value)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* EARNED BADGES — medal style */}
          <Text style={[styles.sectionLabel, { marginTop: 28 }]}>
            Earned Badges{earnedBadges.length > 0 ? ` — ${earnedBadges.length} week${earnedBadges.length !== 1 ? 's' : ''}` : ''}
          </Text>

          {earnedBadges.length > 0 ? (
            <View style={styles.badgeGrid}>
              {earnedBadges.map((b) => {
                const def = WEEKLY_CHALLENGES.find((c) => c.id === b.badge_type) ?? challenge;
                return (
                  <View key={b.id} style={styles.medalCard}>
                    <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.medalCircle}>
                      <Text style={styles.medalEmoji}>{def.icon}</Text>
                    </LinearGradient>
                    <Text style={styles.medalName}>{def.name}</Text>
                    <Text style={styles.medalDate}>
                      {b.week_start ? `Week of ${formatWeek(b.week_start)}` : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyBadges}>
              <Text style={styles.emptyLabel}>No badges yet</Text>
              <Text style={styles.emptyText}>Complete this week's challenge to earn your first badge</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  challengeCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  challengeTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  challengeIcon: {
    fontSize: 36,
  },
  challengeInfo: {
    flex: 1,
    gap: 4,
  },
  challengeName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  challengeDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    lineHeight: 20,
  },
  earnedPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  earnedPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  progressSection: {
    gap: 8,
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#F0F2F5',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  progressNeeded: {
    fontSize: 13,
    fontWeight: '600',
  },
  playerList: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    paddingTop: 14,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerName: {
    width: 90,
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  playerBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F0F2F5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  playerBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  playerValue: {
    width: 44,
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
    textAlign: 'right',
  },
  playerValueQualified: {
    color: '#31af4d',
    fontSize: 14,
  },

  // MEDAL BADGES
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  medalCard: {
    width: '30%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  medalCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFA500',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  medalEmoji: {
    fontSize: 28,
  },
  medalName: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  medalDate: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFA500',
    textAlign: 'center',
  },
  emptyBadges: {
    marginTop: 8,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 20,
  },
});
