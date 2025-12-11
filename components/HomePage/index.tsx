import data from '@/constants/allCoachesTips.json';
import { useJuggles } from '@/hooks/useJuggles';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { getRandomDailyChallenge } from '@/utils/getRandomCoachTips';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CoachsTip from '../common/CoachsTip';

const HomeScreen = () => {
  const router = useRouter();

  const { data: user, isLoading: userLoading } = useUser();
  const {
    data: profile,
    isLoading: loadingProfile,
    refetch: refetchProfile,
  } = useProfile(user?.id);
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useJuggles(user?.id);

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchStats();
    }, [refetchProfile, refetchStats])
  );

  if (userLoading || statsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#3b82f6' />
      </View>
    );
  }

  // --- REAL DATA ---
  const bestScore = stats?.high_score ?? 0;
  const streak = stats?.streak_days ?? 0;
  const sessions = stats?.sessions_count ?? 0;
  const challenge = getRandomDailyChallenge(data);

  const displayName =
    profile?.display_name ||
    profile?.first_name ||
    user?.email?.split('@')[0] ||
    'Player';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          <Text style={styles.greeting}>Hey {displayName}! 👋</Text>
        </Text>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <Image
            source={{
              uri:
                profile?.avatar_url ||
                'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
            }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      {/* BEST SCORE */}
      <View style={styles.bestCard}>
        <Text style={styles.bestLabel}>Your Best Score</Text>
        <Text style={styles.bestValue}>{bestScore}</Text>
        <Text style={styles.bestUnit}>juggles!</Text>
      </View>

      {/* QUICK STATS */}
      <View style={styles.quickStatsRow}>
        <View style={styles.quickStat}>
          <Text style={styles.quickValue}>{sessions}</Text>
          <Text style={styles.quickLabel}>Sessions</Text>
        </View>

        <View style={styles.quickStat}>
          <Text style={styles.quickValue}>{streak}</Text>
          <Text style={styles.quickLabel}>Day Streak</Text>
        </View>
      </View>

      {/* DAILY CHALLENGE */}
      <View style={styles.challengeCard}>
        <View style={styles.challengeHeader}>
          <Text style={styles.challengeTitle}>🎯 Daily Challenge</Text>

          {/* XP Tag (optional) */}
          <View style={styles.xpTag}>
            <Text style={styles.xpText}>+20 XP</Text>
          </View>
        </View>

        <Text style={styles.challengeName}>🔥 Today&apos;s Mission</Text>
        <Text style={styles.challengeDesc}>{challenge}</Text>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.push('/train')}
        >
          <Text style={styles.startButtonText}>Let’s Go!</Text>
        </TouchableOpacity>

        {/* COACH TIP */}
        <CoachsTip />
      </View>
    </ScrollView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  container: {
    padding: 20,
    backgroundColor: '#f9fafb',
  },

  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 30,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
  },

  // BEST SCORE
  bestCard: {
    backgroundColor: '#3b82f6',
    paddingVertical: 30,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  bestLabel: {
    color: '#bfdbfe',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 6,
  },
  bestValue: {
    color: '#fff',
    fontSize: 64,
    fontWeight: '900',
  },
  bestUnit: {
    color: '#e0f2fe',
    fontSize: 20,
    fontWeight: '500',
    marginTop: -5,
  },

  // QUICK STATS
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickStat: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 14,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  quickValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  quickLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },

  // --- DAILY CHALLENGE ---
  challengeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 26,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,

    // soft gradient feel using overlay
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },

  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  challengeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  xpTag: {
    backgroundColor: '#f59e0b22', // faint orange
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },

  xpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
  },

  challengeName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f59e0b', // orange brand color
    marginBottom: 6,
    marginTop: 8,
  },

  challengeDesc: {
    fontSize: 15,
    color: '#4b5563',
    marginBottom: 16,
    lineHeight: 20,
  },

  startButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },

  startButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
});
