import LineChart from '@/components/LineChart';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useJuggles } from '@/hooks/useJuggles';
import { useUser } from '@/hooks/useUser';

const ProgressPage = () => {
  const { data: user } = useUser();
  const { data: stats, isLoading } = useJuggles(user?.id);

  if (isLoading || !stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  // --- DERIVED STATS ---
  const lastDuration = stats.last_session_duration ?? 0;

  // Total estimated time = session_count * last_duration (until full history exists)
  const totalSeconds = stats.sessions_count * lastDuration;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const minutesRemainder = totalMinutes % 60;

  // Improvement = (last_score - average_score) / average_score
  const improvement =
    stats.average_score && stats.average_score > 0
      ? Math.round(
          ((stats.last_score - stats.average_score) / stats.average_score) * 100
        )
      : 0;

  // Dynamic milestones
  const milestones = [
    stats.high_score && {
      icon: 'trophy',
      color: '#f59e0b',
      title: 'New Personal Best!',
      sub: `${stats.high_score} Juggles`,
      date: 'Today',
    },
    stats.best_daily_streak > 5 && {
      icon: 'run-fast',
      color: '#22c55e',
      title: `${stats.best_daily_streak}-Day Streak`,
      sub: "You're on fire 🔥",
      date: 'This week',
    },
    stats.sessions_count > 10 && {
      icon: 'star-circle',
      color: '#3b82f6',
      title: 'Training Milestone',
      sub: `${stats.sessions_count} Sessions`,
      date: 'This month',
    },
  ].filter(Boolean);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Progress 📈</Text>
        <Text style={styles.subtitle}>
          Keep improving one juggle at a time!
        </Text>
      </View>

      {/* Weekly Overview */}
      <View style={styles.weeklyCard}>
        <View style={styles.weekRow}>
          <View style={styles.weekItem}>
            <Text style={styles.weekValue}>{stats.sessions_count}</Text>
            <Text style={styles.weekLabel}>Sessions</Text>
          </View>
          <View style={styles.weekItem}>
            <Text style={styles.weekValue}>
              {totalHours}h {minutesRemainder}m
            </Text>
            <Text style={styles.weekLabel}>Total Time</Text>
          </View>
          <View style={styles.weekItem}>
            <Text style={styles.weekValue}>
              {improvement >= 0 ? `+${improvement}%` : `${improvement}%`}
            </Text>
            <Text style={styles.weekLabel}>Improvement</Text>
          </View>
        </View>
      </View>

      {/* Performance Summary */}
      <Text style={styles.sectionTitle}>Performance Summary</Text>
      <View style={styles.statsGrid}>
        {/* Best Juggles */}
        <View style={[styles.statCard, { backgroundColor: '#3b82f6' }]}>
          <Ionicons name='football-outline' size={28} color='#fff' />
          <Text style={styles.statValue}>{stats.high_score}</Text>
          <Text style={styles.statLabel}>Best Juggles</Text>
        </View>

        {/* Avg Session */}
        <View style={[styles.statCard, { backgroundColor: '#22c55e' }]}>
          <Ionicons name='time-outline' size={28} color='#fff' />
          <Text style={styles.statValue}>{Math.floor(lastDuration / 60)}m</Text>
          <Text style={styles.statLabel}>Avg Session</Text>
        </View>

        {/* Streak */}
        <View style={[styles.statCard, { backgroundColor: '#f59e0b' }]}>
          <Ionicons name='flame-outline' size={28} color='#fff' />
          <Text style={styles.statValue}>{stats.streak_days}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      {/* Streak Tracker */}
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
          <TouchableOpacity style={styles.streakButton}>
            <Text style={styles.streakButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Milestones */}
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

      <LineChart stats={stats} />

      {/* Tip Card */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Coach’s Tip 💬</Text>
        <Text style={styles.tipText}>
          Set small goals — like +10 juggles each week — and celebrate each one.
          Consistency builds champions.
        </Text>
      </View>
    </ScrollView>
  );
};

export default ProgressPage;

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { color: '#6b7280', fontSize: 16 },
  header: {
    marginTop: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
  },
  weeklyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekItem: { alignItems: 'center' },
  weekValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  weekLabel: { fontSize: 13, color: '#6b7280' },
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
  tipTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#075985',
    lineHeight: 20,
  },
});
