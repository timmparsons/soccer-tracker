import { useTeamBadges } from '@/hooks/useTeamBadges';
import { useTeam } from '@/hooks/useTeam';
import { useUser } from '@/hooks/useUser';
import { TEAM_BADGES, AUTO_CHECKED_BADGE_IDS } from '@/lib/teamBadges';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TeamBadgesScreen() {
  const insets = useSafeAreaInsets();
  const { data: user } = useUser();
  const { data: team } = useTeam(user?.id);
  const { data: earnedBadges, isLoading } = useTeamBadges(team?.id);

  const earnedMap = new Map<string, { earned_at: string; count: number }>();
  for (const b of earnedBadges ?? []) {
    const existing = earnedMap.get(b.badge_type);
    if (existing) {
      existing.count++;
      if (b.earned_at > existing.earned_at) existing.earned_at = b.earned_at;
    } else {
      earnedMap.set(b.badge_type, { earned_at: b.earned_at, count: 1 });
    }
  }

  const displayBadges = TEAM_BADGES.filter((b) =>
    AUTO_CHECKED_BADGE_IDS.includes(b.id) || earnedMap.has(b.id),
  );

  const earnedCount = displayBadges.filter((b) => earnedMap.has(b.id)).length;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name='close' size={26} color='#1a1a2e' />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Team Badges</Text>
          {!isLoading && (
            <Text style={styles.subtitle}>
              {earnedCount} of {displayBadges.length} earned
            </Text>
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
          <Text style={styles.sectionLabel}>Weekly Badges</Text>
          <View style={styles.grid}>
            {displayBadges
              .filter((b) => b.repeatable)
              .map((badge) => {
                const earned = earnedMap.get(badge.id);
                return (
                  <View
                    key={badge.id}
                    style={[styles.badgeCard, earned ? styles.badgeCardEarned : styles.badgeCardLocked]}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        {
                          backgroundColor: earned ? badge.color + '22' : '#F0F2F5',
                          borderColor: earned ? badge.color : '#E5E7EB',
                        },
                      ]}
                    >
                      <Text style={[styles.icon, !earned && styles.iconLocked]}>
                        {earned ? badge.icon : '🔒'}
                      </Text>
                      {earned && earned.count > 1 && (
                        <View style={[styles.countBadge, { backgroundColor: badge.color }]}>
                          <Text style={styles.countBadgeText}>×{earned.count}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={2}>
                      {badge.name}
                    </Text>
                    {earned ? (
                      <Text style={[styles.earnedDate, { color: badge.color }]}>
                        {formatDate(earned.earned_at)}
                      </Text>
                    ) : (
                      <Text style={styles.badgeDesc} numberOfLines={2}>
                        {badge.description}
                      </Text>
                    )}
                  </View>
                );
              })}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Milestone Badges</Text>
          <View style={styles.grid}>
            {displayBadges
              .filter((b) => !b.repeatable)
              .map((badge) => {
                const earned = earnedMap.get(badge.id);
                return (
                  <View
                    key={badge.id}
                    style={[styles.badgeCard, earned ? styles.badgeCardEarned : styles.badgeCardLocked]}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        {
                          backgroundColor: earned ? badge.color + '22' : '#F0F2F5',
                          borderColor: earned ? badge.color : '#E5E7EB',
                        },
                      ]}
                    >
                      <Text style={[styles.icon, !earned && styles.iconLocked]}>
                        {earned ? badge.icon : '🔒'}
                      </Text>
                    </View>
                    <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={2}>
                      {badge.name}
                    </Text>
                    {earned ? (
                      <Text style={[styles.earnedDate, { color: badge.color }]}>
                        {formatDate(earned.earned_at)}
                      </Text>
                    ) : (
                      <Text style={styles.badgeDesc} numberOfLines={2}>
                        {badge.description}
                      </Text>
                    )}
                  </View>
                );
              })}
          </View>
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
  headerTitle: {
    flex: 1,
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
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '47%',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    alignItems: 'center',
  },
  badgeCardEarned: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  badgeCardLocked: {
    backgroundColor: '#FFF',
    opacity: 0.6,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 30,
  },
  iconLocked: {
    fontSize: 24,
  },
  countBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF',
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: '#9CA3AF',
  },
  earnedDate: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 15,
  },
});
