import DailyChallengeModal from '@/components/modals/DailyChallengeModal';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface TodayChallengeCardProps {
  userId: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

const TodayChallengeCard = ({ userId }: TodayChallengeCardProps) => {
  const queryClient = useQueryClient();
  const { challenge, steps, userCompletion, isLoading } = useDailyChallenge(userId);
  const [modalVisible, setModalVisible] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size='small' color='#1f89ee' />
      </View>
    );
  }

  if (!challenge) return null;

  const stepSummary = steps
    .map((s) => (s.type === 'single' ? `${s.reps}x ${s.drillName}` : `${s.reps}x ${s.comboName}`))
    .join(' · ');

  const handleCompleted = (_timeSeconds: number) => {
    setModalVisible(false);
    queryClient.invalidateQueries({ queryKey: ['daily-challenge', userId, getLocalDate()] });
    queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    queryClient.invalidateQueries({ queryKey: ['touch-tracking', userId] });
  };

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.headerLabel}>TODAY&apos;S CHALLENGE</Text>
        <Text style={styles.title}>{challenge.title}</Text>

        {steps.length > 0 && (
          <Text style={styles.stepSummary} numberOfLines={2}>
            {stepSummary}
          </Text>
        )}

        {userCompletion ? (
          <View style={styles.completedRow}>
            <View style={styles.completedPill}>
              <Text style={styles.completedPillText}>Done in {formatTime(userCompletion.time_seconds)}</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>Start Challenge</Text>
          </TouchableOpacity>
        )}
      </View>

      <DailyChallengeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        challenge={challenge}
        steps={steps}
        profileId={userId}
        onCompleted={handleCompleted}
      />
    </>
  );
};

export default TodayChallengeCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1f89ee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1f89ee',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  stepSummary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 14,
    lineHeight: 20,
  },
  completedRow: {
    flexDirection: 'row',
  },
  completedPill: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  completedPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#31af4d',
  },
  startButton: {
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    shadowColor: '#1f89ee',
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
});
