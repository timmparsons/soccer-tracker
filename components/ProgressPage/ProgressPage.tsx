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
import { SafeAreaView } from 'react-native-safe-area-context';
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
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
      >
        <View style={styles.emptyContainer}>
          <Ionicons name='stats-chart-outline' size={80} color='#3b82f6' />

          <Text style={styles.emptyTitle}>No Progress Yet</Text>
          <Text style={styles.emptySubtitle}>
            Once you complete your first juggling session, your progress will
            appear here.
          </Text>

          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => {
              // navigate to training page (edit based on your routing)
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
  // NORMAL PROGRESS VIEW (existing behavior)
  // -----------------------------------------------------------------

  const lastDuration = stats?.last_session_duration ?? 0;

  const improvement =
    stats?.average_score > 0 ? stats?.last_score - stats?.average_score : 0;

  // Build milestone list
  const milestones = [];

  if (stats?.sessions_count >= 1 && stats?.high_score) {
    milestones.push({
      icon: 'trophy',
      color: '#f59e0b',
      title: 'New Personal Best!',
      sub: `${stats.high_score} Juggles`,
      date: new Date(stats.last_session_date).toLocaleDateString(),
    });
  }

  if (stats?.sessions_count === 1) {
    milestones.push({
      icon: 'star-circle',
      color: '#3b82f6',
      title: 'First Training Session',
      sub: 'Great start to your journey!',
      date: new Date(stats.last_session_date).toLocaleDateString(),
    });
  }

  if (stats?.streak_days >= 2) {
    milestones.push({
      icon: 'run-fast',
      color: '#22c55e',
      title: `${stats.streak_days}-Day Streak`,
      sub: 'Consistency is key!',
      date: new Date(stats.last_session_date).toLocaleDateString(),
    });
  }

  if (stats?.sessions_count >= 5) {
    milestones.push({
      icon: 'run-fast',
      color: '#8b5cf6',
      title: `${stats.sessions_count} Training Sessions`,
      sub: 'Nice training volume!',
      date: new Date(stats.last_session_date).toLocaleDateString(),
    });
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress 📈</Text>
        <Text style={styles.subtitle}>
          Keep improving one juggle at a time!
        </Text>
      </View>

      {/* PERFORMANCE SUMMARY */}
      <Text style={styles.sectionTitle}>Performance Summary</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#3b82f6' }]}>
          <Ionicons name='football-outline' size={28} color='#fff' />
          <Text style={styles.statValue}>{stats.high_score}</Text>
          <Text style={styles.statLabel}>Best Juggles</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#22c55e' }]}>
          <Ionicons name='time-outline' size={28} color='#fff' />
          <Text style={styles.statValue}>{Math.floor(lastDuration / 60)}m</Text>
          <Text style={styles.statLabel}>Avg Session</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#f59e0b' }]}>
          <Ionicons name='flame-outline' size={28} color='#fff' />
          <Text style={styles.statValue}>{stats.streak_days}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      {/* STREAK TRACKER */}
      <Text style={styles.sectionTitle}>Streak Tracker</Text>
      <View style={styles.streakCard}>
        <View style={styles.streakRow}>
          <MaterialCommunityIcons
            name='calendar-check'
            size={30}
            color='#3b82f6'
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.streakTitle}>
              {stats.streak_days}-Day Streak 🔥
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
            <MaterialCommunityIcons name={m.icon} size={26} color={m.color} />
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
      <CoachsTip />

      {/* STREAK MODAL */}
      <Modal visible={showStreakModal} animationType='slide'>
        <SafeAreaView style={{ padding: 30, flex: 1 }}>
          <Text style={{ fontSize: 26, fontWeight: '700', marginBottom: 16 }}>
            Streak Details 🔥
          </Text>

          <Text style={styles.modalText}>
            Current Streak: {stats.streak_days} days
          </Text>

          <Text style={styles.modalText}>
            Best Streak: {stats.best_daily_streak} days
          </Text>

          <Text style={styles.modalText}>
            Last Session:{' '}
            {new Date(stats.last_session_date).toLocaleDateString()}
          </Text>

          <TouchableOpacity
            style={{ marginTop: 24 }}
            onPress={() => setShowStreakModal(false)}
          >
            <Text style={{ color: '#3b82f6', fontSize: 18 }}>Close</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
};

export default ProgressPage;

//
// STYLES
//
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#6b7280', fontSize: 16 },

  // EMPTY STATE
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 6,
  },
  emptyButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  header: { marginTop: 20, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 15, color: '#6b7280' },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  statCard: {
    borderRadius: 16,
    padding: 16,
    width: '30%',
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 6 },
  statLabel: { color: '#e5e7eb', fontSize: 13 },

  streakCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  streakSub: { color: '#6b7280', fontSize: 13 },
  streakButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  streakButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  milestoneCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noMilestoneText: {
    textAlign: 'center',
    color: '#6b7280',
    paddingVertical: 16,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  milestoneDetails: { flex: 1, marginLeft: 12 },
  milestoneTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  milestoneSub: { fontSize: 13, color: '#6b7280' },
  milestoneDate: { fontSize: 12, color: '#9ca3af' },

  tipCard: {
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    padding: 16,
    marginVertical: 24,
  },
  tipTitle: { fontSize: 17, fontWeight: '700', color: '#0369a1' },
  tipText: { fontSize: 14, color: '#075985', lineHeight: 20 },

  modalText: { fontSize: 18, marginBottom: 12 },
});
