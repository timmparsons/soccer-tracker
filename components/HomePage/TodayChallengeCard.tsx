import { useChallengeStats, useTodayChallenge } from '@/hooks/useTouchTracking';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TodayChallengeCardProps {
  userId: string;
  onStartChallenge: (drillId: string, durationMinutes: number, drillName: string) => void;
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  beginner: { bg: '#E8F5E9', text: '#388E3C' },
  intermediate: { bg: '#FFF3E0', text: '#F57C00' },
  advanced: { bg: '#FFEBEE', text: '#D32F2F' },
};

const TodayChallengeCard = ({ userId, onStartChallenge }: TodayChallengeCardProps) => {
  const { data: challenge, isLoading: challengeLoading } = useTodayChallenge(userId);
  const { data: stats } = useChallengeStats(userId, challenge?.id);

  if (challengeLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size='small' color='#10B981' />
      </View>
    );
  }

  if (!challenge) return null;

  const durationMinutes = Math.round(challenge.challenge_duration_seconds / 60);
  const difficulty = challenge.difficulty_level as string;
  const difficultyStyle = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS['beginner'];
  const completedToday = stats?.completedToday ?? false;

  return (
    <View style={styles.card}>
      <Text style={styles.headerLabel}>TODAY&apos;S CHALLENGE</Text>

      {/* Video placeholder */}
      <View style={styles.videoPlaceholder}>
        <View style={styles.playButton}>
          <Ionicons name='play' size={28} color='#FFF' />
        </View>
        <Text style={styles.videoCaption}>Drill Tutorial</Text>
      </View>

      <View style={styles.drillRow}>
        <Text style={styles.drillName}>{challenge.name}</Text>
        <View style={[styles.difficultyChip, { backgroundColor: difficultyStyle.bg }]}>
          <Text style={[styles.difficultyText, { color: difficultyStyle.text }]}>
            {difficulty}
          </Text>
        </View>
      </View>

      <Text style={styles.goalLine}>
        Get as many touches as you can in {durationMinutes} min
      </Text>

      {completedToday ? (
        <View style={styles.completedButton}>
          <Text style={styles.completedText}>Completed today! Come back tomorrow 🎉</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => onStartChallenge(challenge.id, durationMinutes, challenge.name)}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Start Challenge</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default TodayChallengeCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  drillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  drillName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
    flexShrink: 1,
  },
  difficultyChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  goalLine: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  completedButton: {
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  completedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
  },
  videoPlaceholder: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    height: 170,
    marginBottom: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCaption: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
  },
});
