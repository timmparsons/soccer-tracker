import { useJuggles } from '@/hooks/useJuggles';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
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
        <Text style={styles.challengeTitle}>Daily Challenge</Text>
        <Text style={styles.challengeName}>Keep It Up!</Text>
        <Text style={styles.challengeDesc}>
          Try to juggle 25 times without dropping it!
        </Text>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.push('/train')} // 👈 NAVIGATES TO TRAIN TAB
        >
          <Text style={styles.startButtonText}>Start</Text>
        </TouchableOpacity>
      </View>

      {/* COACH TIP */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Coach Tip 💬</Text>
        <Text style={styles.tipText}>
          Stay calm and hit the ball softly. Big kicks = big mistakes!
        </Text>
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

  // CHALLENGE
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 24,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  challengeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  challengeDesc: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '700',
  },

  // COACH TIP
  tipCard: {
    backgroundColor: '#e0f2fe',
    padding: 16,
    borderRadius: 14,
    marginBottom: 40,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 4,
  },
  tipText: {
    color: '#075985',
    fontSize: 14,
    lineHeight: 20,
  },
});
