import { useJuggles } from '@/hooks/useJuggles';
import { useSessions } from '@/hooks/useSessions';
import { useUser } from '@/hooks/useUser';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Memoized components for better performance
const ProgressCard = memo(
  ({
    totalJuggles,
    highScore,
    currentStreak,
  }: {
    totalJuggles: number;
    highScore: number;
    currentStreak: number;
  }) => (
    <View style={styles.progressCard}>
      <View style={styles.progressRow}>
        <View style={styles.progressItem}>
          <Text style={styles.progressValue}>{totalJuggles}</Text>
          <Text style={styles.progressLabel}>Total Juggles</Text>
        </View>
        <View style={styles.progressItem}>
          <Text style={styles.progressValue}>{highScore}</Text>
          <Text style={styles.progressLabel}>Best Score</Text>
        </View>
        <View style={styles.progressItem}>
          <Text style={styles.progressValue}>{currentStreak}</Text>
          <Text style={styles.progressLabel}>Days Streak</Text>
        </View>
      </View>
    </View>
  )
);

ProgressCard.displayName = 'ProgressCard';

const TrainingModes = memo(
  ({ onModePress }: { onModePress: (path: string) => void }) => (
    <>
      <Text style={styles.sectionTitle}>Training Modes</Text>
      <View style={styles.modeContainer}>
        {/* Warm-Up */}
        <TouchableOpacity
          style={[styles.modeCard, styles.easy]}
          onPress={() => onModePress('/warm-up')}
        >
          <MaterialCommunityIcons name='soccer' size={28} color='#fff' />
          <Text style={styles.modeTitle}>Warm-Up</Text>
          <Text style={styles.modeDesc}>
            Simple juggling drills to get started
          </Text>
        </TouchableOpacity>

        {/* Timed Drill */}
        <TouchableOpacity
          style={[styles.modeCard, styles.medium]}
          onPress={() => onModePress('/train/timer')}
        >
          <Ionicons name='flash' size={28} color='#fff' />
          <Text style={styles.modeTitle}>Timed Drill</Text>
          <Text style={styles.modeDesc}>
            Push your limit with a timed session
          </Text>
        </TouchableOpacity>

        {/* Skill Challenge */}
        <TouchableOpacity
          style={[styles.modeCard, styles.hard]}
          onPress={() => onModePress('/train/challenge')}
        >
          <Ionicons name='trophy' size={28} color='#fff' />
          <Text style={styles.modeTitle}>Skill Challenge</Text>
          <Text style={styles.modeDesc}>
            Beat your personal best & earn stars
          </Text>
        </TouchableOpacity>
      </View>
    </>
  )
);

TrainingModes.displayName = 'TrainingModes';

const RecentPractices = memo(({ sessions }: { sessions: any[] }) => (
  <>
    <Text style={styles.sectionTitle}>Recent Practices</Text>
    <View style={styles.practiceList}>
      {sessions.length === 0 ? (
        <Text style={styles.emptyText}>
          No recent sessions yet — start training!
        </Text>
      ) : (
        sessions.map((s) => (
          <View key={s.id} style={styles.practiceItem}>
            <View style={styles.practiceIcon}>
              <Ionicons name='timer-outline' size={24} color='#3b82f6' />
            </View>

            <View style={styles.practiceDetails}>
              <Text style={styles.practiceTitle}>Timed Drill</Text>
              <Text style={styles.practiceSub}>
                Score: {s.score} — {Math.round(s.duration / 60)} min
              </Text>
            </View>

            <Text style={styles.practiceStars}>+{s.score}⭐</Text>
          </View>
        ))
      )}
    </View>
  </>
));

RecentPractices.displayName = 'RecentPractices';

const CoachTip = memo(() => (
  <View style={styles.tipCard}>
    <Text style={styles.tipTitle}>Coach&apos;s Tip 💬</Text>
    <Text style={styles.tipText}>
      Try alternating between your left and right foot every 5 juggles to
      improve balance and control.
    </Text>
  </View>
));

CoachTip.displayName = 'CoachTip';

const TrainPage = () => {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: juggles, isLoading: jugglesLoading } = useJuggles(user?.id);
  const { data: sessions, isLoading: sessionsLoading } = useSessions(user?.id);

  // Memoized computed values
  const stats = useMemo(() => {
    const totalJuggles =
      sessions?.reduce((sum, s) => sum + (s.score || 0), 0) ?? 0;
    const highScore = juggles?.high_score ?? 0;
    const currentStreak = juggles?.streak_days ?? 0;
    const recentSessions = sessions?.slice(-3).reverse() ?? [];

    return { totalJuggles, highScore, currentStreak, recentSessions };
  }, [sessions, juggles]);

  const handleModePress = (path: string) => {
    router.push(path as any);
  };

  if (jugglesLoading || sessionsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#3b82f6' />
      </View>
    );
  }

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
      <ProgressCard {...stats} />

      {/* Training Modes */}
      <TrainingModes onModePress={handleModePress} />

      {/* Recent Practice Section */}
      <RecentPractices sessions={stats.recentSessions} />

      {/* Bottom Tip */}
      <CoachTip />
    </ScrollView>
  );
};

export default TrainPage;

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
    backgroundColor: '#f9fafb',
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
  easy: { backgroundColor: '#22c55e' },
  medium: { backgroundColor: '#3b82f6' },
  hard: { backgroundColor: '#f59e0b' },
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
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    textAlign: 'center',
    padding: 12,
    color: '#6b7280',
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
