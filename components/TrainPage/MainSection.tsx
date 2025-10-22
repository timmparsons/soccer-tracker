import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const MainSection = () => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Train ⚽</Text>
        <Text style={styles.subtitle}>
          Master your juggling skills step by step
        </Text>
      </View>

      {/* Progress Overview */}
      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <View style={styles.progressItem}>
            <Text style={styles.progressValue}>325</Text>
            <Text style={styles.progressLabel}>Total Juggles</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={styles.progressValue}>45</Text>
            <Text style={styles.progressLabel}>Best Streak</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={styles.progressValue}>7</Text>
            <Text style={styles.progressLabel}>Days Streak</Text>
          </View>
        </View>
      </View>

      {/* Training Modes */}
      <Text style={styles.sectionTitle}>Training Modes</Text>
      <View style={styles.modeContainer}>
        <TouchableOpacity style={[styles.modeCard, styles.easy]}>
          <MaterialCommunityIcons name='soccer' size={28} color='#fff' />
          <Text style={styles.modeTitle}>Warm-Up</Text>
          <Text style={styles.modeDesc}>
            Simple juggling drills to get started
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.modeCard, styles.medium]}>
          <Ionicons name='flash' size={28} color='#fff' />
          <Text style={styles.modeTitle}>Timed Drill</Text>
          <Text style={styles.modeDesc}>
            Juggle as long as possible in 60 seconds
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.modeCard, styles.hard]}>
          <Ionicons name='trophy' size={28} color='#fff' />
          <Text style={styles.modeTitle}>Skill Challenge</Text>
          <Text style={styles.modeDesc}>
            Hit your personal best and earn bonus stars
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent Practice Section */}
      <Text style={styles.sectionTitle}>Recent Practices</Text>
      <View style={styles.practiceList}>
        <View style={styles.practiceItem}>
          <View style={styles.practiceIcon}>
            <Ionicons name='timer-outline' size={24} color='#3b82f6' />
          </View>
          <View style={styles.practiceDetails}>
            <Text style={styles.practiceTitle}>Timed Drill</Text>
            <Text style={styles.practiceSub}>Best: 43 juggles</Text>
          </View>
          <Text style={styles.practiceStars}>+25⭐</Text>
        </View>

        <View style={styles.practiceItem}>
          <View style={styles.practiceIcon}>
            <Ionicons name='football-outline' size={24} color='#16a34a' />
          </View>
          <View style={styles.practiceDetails}>
            <Text style={styles.practiceTitle}>Warm-Up</Text>
            <Text style={styles.practiceSub}>Completed today</Text>
          </View>
          <Text style={styles.practiceStars}>+10⭐</Text>
        </View>
      </View>

      {/* Bottom Tip */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Coach’s Tip 💬</Text>
        <Text style={styles.tipText}>
          Try alternating between your left and right foot every 5 juggles to
          improve balance and control.
        </Text>
      </View>
    </ScrollView>
  );
};

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
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressItem: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  progressLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 24,
    marginBottom: 8,
  },
  modeContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  modeCard: {
    borderRadius: 16,
    padding: 16,
  },
  easy: {
    backgroundColor: '#22c55e',
  },
  medium: {
    backgroundColor: '#3b82f6',
  },
  hard: {
    backgroundColor: '#f59e0b',
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  modeDesc: {
    color: '#e5e7eb',
    fontSize: 13,
    marginTop: 2,
  },
  practiceList: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
  },
  practiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  practiceIcon: {
    marginRight: 12,
  },
  practiceDetails: {
    flex: 1,
  },
  practiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  practiceSub: {
    fontSize: 13,
    color: '#6b7280',
  },
  practiceStars: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f59e0b',
  },
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

export default MainSection;
