import { useTeamPlayers } from '@/hooks/useTeamPlayers';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/* --------------------------------------------------------------------------
   TEAM OVERVIEW CARD (For Coaches)
--------------------------------------------------------------------------- */
export const TeamOverviewCard = memo(({ teamId }: { teamId?: string }) => {
  const router = useRouter();
  const { data: teamPlayers } = useTeamPlayers(teamId);

  if (!teamId || !teamPlayers || teamPlayers.length === 0) {
    return null;
  }

  // Calculate stats
  const totalPlayers = teamPlayers.length;
  const totalSessions = teamPlayers.reduce(
    (sum, p) => sum + (p.stats?.sessions_count || 0),
    0
  );
  const totalXp = teamPlayers.reduce((sum, p) => sum + (p.total_xp || 0), 0);

  // Top performer (highest XP)
  const topPerformer = teamPlayers.reduce((top, player) =>
    (player.total_xp || 0) > (top?.total_xp || 0) ? player : top
  );

  // Most improved (need to track level changes - for now use highest level)
  const mostImproved = teamPlayers.reduce((top, player) =>
    (player.level || 0) > (top?.level || 0) ? player : top
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBadge}>
          <Ionicons name='trophy' size={24} color='#FFD700' />
        </View>
        <Text style={styles.cardTitle}>Team Overview</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalPlayers}</Text>
          <Text style={styles.statLabel}>Players</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalSessions}</Text>
          <Text style={styles.statLabel}>Total Sessions</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalXp.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Team XP</Text>
        </View>
      </View>

      <View style={styles.highlights}>
        <View style={styles.highlightRow}>
          <Ionicons name='star' size={16} color='#ffb724' />
          <Text style={styles.highlightText}>
            Top Performer:{' '}
            <Text style={styles.highlightName}>
              {topPerformer?.display_name || topPerformer?.first_name} (Lvl{' '}
              {topPerformer?.level || 1})
            </Text>
          </Text>
        </View>
        <View style={styles.highlightRow}>
          <Ionicons name='trending-up' size={16} color='#22c55e' />
          <Text style={styles.highlightText}>
            Highest Level:{' '}
            <Text style={styles.highlightName}>
              {mostImproved?.display_name || mostImproved?.first_name} (Lvl{' '}
              {mostImproved?.level || 1})
            </Text>
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.viewTeamButton}
        onPress={() => router.push('/coach')}
      >
        <Text style={styles.viewTeamText}>View Full Team</Text>
        <Ionicons name='chevron-forward' size={18} color='#1f89ee' />
      </TouchableOpacity>
    </View>
  );
});

TeamOverviewCard.displayName = 'TeamOverviewCard';

/* --------------------------------------------------------------------------
   WEEKLY PROGRESS CARD (For Coaches)
--------------------------------------------------------------------------- */
export const WeeklyProgressCard = memo(({ teamId }: { teamId?: string }) => {
  const { data: teamPlayers } = useTeamPlayers(teamId);

  if (!teamId || !teamPlayers || teamPlayers.length === 0) {
    return null;
  }

  // Get dates for this week
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  // Calculate this week's stats
  const activePlayers = teamPlayers.filter((p) => {
    const lastSession = new Date(p.stats?.last_session_date || 0);
    return lastSession > weekAgo;
  }).length;

  // Total sessions this week (approximate based on recent activity)
  const weekSessions = teamPlayers.reduce((sum, p) => {
    const lastSession = new Date(p.stats?.last_session_date || 0);
    if (lastSession > weekAgo) {
      return sum + 1; // At least 1 session this week
    }
    return sum;
  }, 0);

  const avgPerPlayer =
    teamPlayers.length > 0
      ? (weekSessions / teamPlayers.length).toFixed(1)
      : '0.0';

  // New high scores this week (players whose last score is their high score and recent)
  const newHighScores = teamPlayers.filter((p) => {
    const lastSession = new Date(p.stats?.last_session_date || 0);
    return (
      lastSession > weekAgo &&
      p.stats?.last_score === p.stats?.high_score &&
      p.stats?.high_score > 0
    );
  }).length;

  // Calculate percentage of active players
  const activePercentage = Math.round(
    (activePlayers / teamPlayers.length) * 100
  );
  const isGoodWeek = activePercentage >= 70;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBadge}>
          <Ionicons name='bar-chart' size={24} color='#1f89ee' />
        </View>
        <Text style={styles.cardTitle}>This Week&apos;s Progress</Text>
      </View>

      <View style={styles.weeklyStats}>
        <View style={styles.weeklyStatRow}>
          <View style={styles.weeklyStatLeft}>
            <Text style={styles.weeklyStatLabel}>Active Players</Text>
            <Text style={styles.weeklyStatValue}>
              {activePlayers}/{teamPlayers.length}
            </Text>
          </View>
          <View style={styles.weeklyStatIndicator}>
            {isGoodWeek ? (
              <Ionicons name='checkmark-circle' size={32} color='#22c55e' />
            ) : (
              <Ionicons name='alert-circle' size={32} color='#ffb724' />
            )}
          </View>
        </View>

        <View style={styles.weeklyMetrics}>
          <View style={styles.metric}>
            <Ionicons name='fitness' size={20} color='#1f89ee' />
            <Text style={styles.metricValue}>{weekSessions}</Text>
            <Text style={styles.metricLabel}>Total Sessions</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metric}>
            <Ionicons name='trending-up' size={20} color='#22c55e' />
            <Text style={styles.metricValue}>{avgPerPlayer}</Text>
            <Text style={styles.metricLabel}>Avg per Player</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metric}>
            <Ionicons name='trophy' size={20} color='#FFD700' />
            <Text style={styles.metricValue}>{newHighScores}</Text>
            <Text style={styles.metricLabel}>New Records</Text>
          </View>
        </View>
      </View>

      <View style={styles.weeklyNote}>
        <Ionicons
          name='information-circle'
          size={16}
          color={isGoodWeek ? '#22c55e' : '#ffb724'}
        />
        <Text style={styles.weeklyNoteText}>
          {isGoodWeek
            ? 'Great week! Team engagement is strong 💪'
            : 'Encourage more players to train this week'}
        </Text>
      </View>
    </View>
  );
});

WeeklyProgressCard.displayName = 'WeeklyProgressCard';

/* --------------------------------------------------------------------------
   STYLES
--------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2C3E50',
  },

  // Team Overview Stats
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  highlights: {
    gap: 12,
    marginBottom: 16,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  highlightName: {
    fontWeight: '800',
    color: '#2C3E50',
  },
  viewTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 4,
  },
  viewTeamText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f89ee',
  },

  // Weekly Progress
  weeklyStats: {
    gap: 16,
  },
  weeklyStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
    padding: 16,
    borderRadius: 12,
  },
  weeklyStatLeft: {
    flex: 1,
  },
  weeklyStatLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  weeklyStatValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2C3E50',
  },
  weeklyStatIndicator: {
    marginLeft: 16,
  },
  weeklyMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2C3E50',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  weeklyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  weeklyNoteText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
  },
});
