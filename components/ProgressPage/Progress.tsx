import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ProgressPage = () => {
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
            <Text style={styles.weekValue}>12</Text>
            <Text style={styles.weekLabel}>Sessions</Text>
          </View>
          <View style={styles.weekItem}>
            <Text style={styles.weekValue}>2h 45m</Text>
            <Text style={styles.weekLabel}>Total Time</Text>
          </View>
          <View style={styles.weekItem}>
            <Text style={styles.weekValue}>+18%</Text>
            <Text style={styles.weekLabel}>Improvement</Text>
          </View>
        </View>
      </View>

      {/* Performance Summary */}
      <Text style={styles.sectionTitle}>Performance Summary</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#3b82f6' }]}>
          <Ionicons name='football-outline' size={28} color='#fff' />
          <Text style={styles.statValue}>142</Text>
          <Text style={styles.statLabel}>Best Juggles</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#22c55e' }]}>
          <Ionicons name='time-outline' size={28} color='#fff' />
          <Text style={styles.statValue}>6m 30s</Text>
          <Text style={styles.statLabel}>Avg Session</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#f59e0b' }]}>
          <Ionicons name='flame-outline' size={28} color='#fff' />
          <Text style={styles.statValue}>9</Text>
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
            <Text style={styles.streakTitle}>9-Day Streak 🔥</Text>
            <Text style={styles.streakSub}>Keep it going to hit 10 days!</Text>
          </View>
          <TouchableOpacity style={styles.streakButton}>
            <Text style={styles.streakButtonText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Milestones */}
      <Text style={styles.sectionTitle}>Recent Milestones</Text>
      <View style={styles.milestoneCard}>
        <View style={styles.milestoneRow}>
          <MaterialCommunityIcons name='trophy' size={26} color='#f59e0b' />
          <View style={styles.milestoneDetails}>
            <Text style={styles.milestoneTitle}>New Personal Best!</Text>
            <Text style={styles.milestoneSub}>142 Juggles</Text>
          </View>
          <Text style={styles.milestoneDate}>Today</Text>
        </View>

        <View style={styles.milestoneRow}>
          <MaterialCommunityIcons
            name='star-circle'
            size={26}
            color='#3b82f6'
          />
          <View style={styles.milestoneDetails}>
            <Text style={styles.milestoneTitle}>1-Hour Practice</Text>
            <Text style={styles.milestoneSub}>Great consistency</Text>
          </View>
          <Text style={styles.milestoneDate}>Yesterday</Text>
        </View>

        <View style={styles.milestoneRow}>
          <MaterialCommunityIcons name='run-fast' size={26} color='#22c55e' />
          <View style={styles.milestoneDetails}>
            <Text style={styles.milestoneTitle}>First 7-Day Streak</Text>
            <Text style={styles.milestoneSub}>You're on fire 🔥</Text>
          </View>
          <Text style={styles.milestoneDate}>2 days ago</Text>
        </View>
      </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
  },
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
