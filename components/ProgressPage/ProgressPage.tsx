import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useJuggles } from '@/hooks/useJuggles';
import { useUser } from '@/hooks/useUser';
import { router } from 'expo-router';
import LineChart from '../LineChart';
import CoachsTip from '../common/CoachsTip';

const ProgressPage = () => {
  const { data: user } = useUser();
  const { data: stats, isLoading } = useJuggles(user?.id);

  const [showStreakModal, setShowStreakModal] = useState(false);

  // -----------------------------------------------------------------
  // EMPTY STATE CHECK
  // -----------------------------------------------------------------
  const isBrandNew =
    !isLoading &&
    (!stats ||
      stats?.sessions_count === 0 ||
      !Array.isArray(stats?.scores_history) ||
      stats?.scores_history.length === 0);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  if (isBrandNew) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingBottom: 90,
        }}
      >
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name='stats-chart-outline' size={64} color='#2B9FFF' />
          </View>

          <Text style={styles.emptyTitle}>No Progress Yet</Text>
          <Text style={styles.emptySubtitle}>
            Complete your first training session to start tracking your
            improvement.
          </Text>

          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => {
              router.push('/train');
            }}
          >
            <Text style={styles.emptyButtonText}>Start Training</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // -----------------------------------------------------------------
  // NORMAL PROGRESS VIEW
  // -----------------------------------------------------------------

  const lastDuration = stats?.last_session_duration ?? 0;
  const improvement =
    stats?.average_score > 0 ? stats?.last_score - stats?.average_score : 0;

  // Build milestone list
  const milestones = [];

  if (stats?.sessions_count >= 1 && stats?.high_score) {
    milestones.push({
      icon: 'trophy',
      color: '#FFD700',
      title: 'New Personal Best!',
      sub: `${stats.high_score} Juggles`,
      date: new Date(stats.last_session_date).toLocaleDateString(),
    });
  }

  if (stats?.sessions_count === 1) {
    milestones.push({
      icon: 'star-circle',
      color: '#2B9FFF',
      title: 'First Training Session',
      sub: 'Great start to your journey!',
      date: new Date(stats.last_session_date).toLocaleDateString(),
    });
  }

  if (stats?.streak_days >= 2) {
    milestones.push({
      icon: 'run-fast',
      color: '#FFA500',
      title: `${stats.streak_days}-Day Streak`,
      sub: 'Consistency is key!',
      date: new Date(stats.last_session_date).toLocaleDateString(),
    });
  }

  if (stats?.sessions_count >= 5) {
    milestones.push({
      icon: 'run-fast',
      color: '#2C3E50',
      title: `${stats.sessions_count} Training Sessions`,
      sub: 'Nice training volume!',
      date: new Date(stats.last_session_date).toLocaleDateString(),
    });
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.headerIconBadge}>
            <Ionicons name='stats-chart' size={28} color='#2B9FFF' />
          </View>
          <View style={styles.titleContent}>
            <Text style={styles.title}>Your Progress</Text>
            <Text style={styles.subtitle}>
              Keep improving one juggle at a time
            </Text>
          </View>
        </View>
      </View>

      {/* PERFORMANCE SUMMARY */}
      <Text style={styles.sectionTitle}>Performance Summary</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statCardBlue]}>
          <View style={styles.statIconContainer}>
            <Ionicons name='football' size={28} color='#2B9FFF' />
          </View>
          <Text style={styles.statValue}>{stats.high_score}</Text>
          <Text style={styles.statLabel}>Best Score</Text>
        </View>

        <View style={[styles.statCard, styles.statCardNavy]}>
          <View style={styles.statIconContainer}>
            <Ionicons name='time' size={28} color='#FFF' />
          </View>
          <Text style={styles.statValue}>{Math.floor(lastDuration / 60)}m</Text>
          <Text style={styles.statLabel}>Avg Session</Text>
        </View>

        <View style={[styles.statCard, styles.statCardOrange]}>
          <View style={styles.statIconContainer}>
            <Ionicons name='flame' size={28} color='#FFA500' />
          </View>
          <Text style={styles.statValue}>{stats.streak_days}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      {/* STREAK TRACKER */}
      <Text style={styles.sectionTitle}>Streak Tracker</Text>
      <View style={styles.streakCard}>
        <View style={styles.streakRow}>
          <View style={styles.streakIconContainer}>
            <MaterialCommunityIcons
              name='calendar-check'
              size={28}
              color='#FFA500'
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.streakTitle}>
              {stats.streak_days}-Day Streak
            </Text>
            <Text style={styles.streakSub}>
              Keep it going to hit {stats.streak_days + 1} days!
            </Text>
          </View>

          <TouchableOpacity
            style={styles.streakButton}
            onPress={() => setShowStreakModal(true)}
          >
            <Text style={styles.streakButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MILESTONES */}
      <Text style={styles.sectionTitle}>Recent Milestones</Text>
      <View style={styles.milestoneCard}>
        {milestones.length === 0 && (
          <Text style={styles.noMilestoneText}>
            No major milestones yet — keep training!
          </Text>
        )}

        {milestones.map((m, idx) => (
          <View key={idx} style={styles.milestoneRow}>
            <View
              style={[
                styles.milestoneIconContainer,
                { backgroundColor: `${m.color}20` },
              ]}
            >
              <MaterialCommunityIcons name={m.icon} size={24} color={m.color} />
            </View>
            <View style={styles.milestoneDetails}>
              <Text style={styles.milestoneTitle}>{m.title}</Text>
              <Text style={styles.milestoneSub}>{m.sub}</Text>
            </View>
            <Text style={styles.milestoneDate}>{m.date}</Text>
          </View>
        ))}
      </View>

      {/* CHART */}
      {stats.scores_history &&
        Array.isArray(stats.scores_history) &&
        stats.scores_history.length > 0 && <LineChart stats={stats} />}

      {/* TIP */}
      <View style={styles.tipContainer}>
        <CoachsTip />
      </View>

      {/* STREAK MODAL */}
      <Modal visible={showStreakModal} animationType='slide' transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name='flame' size={48} color='#FFA500' />
              </View>
              <Text style={styles.modalTitle}>Streak Details</Text>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalStatRow}>
                <Text style={styles.modalStatLabel}>Current Streak</Text>
                <Text style={styles.modalStatValue}>
                  {stats.streak_days} days
                </Text>
              </View>

              <View style={styles.modalStatRow}>
                <Text style={styles.modalStatLabel}>Best Streak</Text>
                <Text style={styles.modalStatValue}>
                  {stats.best_daily_streak} days
                </Text>
              </View>

              <View style={styles.modalStatRow}>
                <Text style={styles.modalStatLabel}>Last Session</Text>
                <Text style={styles.modalStatValue}>
                  {new Date(stats.last_session_date).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowStreakModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default ProgressPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },

  // EMPTY STATE
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(43, 159, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  emptyButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 32,
    shadowColor: '#FFA500',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 17,
  },

  // HEADER
  header: {
    marginTop: 40,
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(43, 159, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2C3E50',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C3E50',
    marginTop: 28,
    marginBottom: 12,
  },

  // STATS GRID
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statCardBlue: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#2B9FFF',
  },
  statCardNavy: {
    backgroundColor: '#2C3E50',
  },
  statCardOrange: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    color: '#6B7280',
  },

  // STREAK CARD
  streakCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2C3E50',
    marginBottom: 4,
  },
  streakSub: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  streakButton: {
    backgroundColor: '#2B9FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#2B9FFF',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  streakButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },

  // MILESTONES
  milestoneCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  noMilestoneText: {
    textAlign: 'center',
    color: '#6B7280',
    paddingVertical: 16,
    fontWeight: '500',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  milestoneIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneDetails: {
    flex: 1,
    marginLeft: 12,
  },
  milestoneTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 2,
  },
  milestoneSub: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  milestoneDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  tipContainer: {
    marginTop: 8,
    marginBottom: 24,
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 62, 80, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#2C3E50',
    textAlign: 'center',
  },
  modalBody: {
    marginBottom: 24,
  },
  modalStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalStatLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2C3E50',
  },
  modalCloseButton: {
    backgroundColor: '#2B9FFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2B9FFF',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalCloseText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900',
  },
});
