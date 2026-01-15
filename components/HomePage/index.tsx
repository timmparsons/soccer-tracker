import data from '@/constants/allCoachesTips.json';
import { useJuggles } from '@/hooks/useJuggles';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { getLevelFromXp, getRankBadge, getRankName } from '@/lib/xp';
import { getDisplayName } from '@/utils/getDisplayName';
import { getRandomDailyChallenge } from '@/utils/getRandomCoachTips';
import { Ionicons } from '@expo/vector-icons';
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
import { SafeAreaView } from 'react-native-safe-area-context';
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

  if (userLoading || statsLoading || loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#FFA500' />
      </View>
    );
  }

  // --- REAL DATA ---
  const bestScore = stats?.high_score ?? 0;
  const streak = stats?.streak_days ?? 0;
  const sessions = stats?.sessions_count ?? 0;
  const challenge = getRandomDailyChallenge(data);

  const displayName = getDisplayName(profile);

  // XP Data
  const totalXp = profile?.total_xp ?? 0;
  const { level, xpIntoLevel, xpForNextLevel } = getLevelFromXp(totalXp);
  const rankName = getRankName(level);
  const { color, icon } = getRankBadge(rankName);
  const xpPercent = Math.min((xpIntoLevel / xpForNextLevel) * 100, 100);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* HEADER */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            Hey <Text style={styles.nameHighlight}>{displayName}</Text>! 👋
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <View style={styles.avatarGlow} />
          <Image
            source={{
              uri:
                profile?.avatar_url ||
                'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
            }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </SafeAreaView>

      {/* LEVEL / XP CARD */}
      <TouchableOpacity
        style={[styles.levelCard, { borderLeftColor: color }]}
        onPress={() => router.push('/profile')}
        activeOpacity={0.7}
      >
        <View style={styles.levelHeader}>
          <View style={styles.levelLeft}>
            <Ionicons
              name={icon as any}
              size={32}
              color={color}
              style={{ marginRight: 12 }}
            />
            <View>
              <Text style={styles.levelNumber}>Level {level}</Text>
              <Text style={[styles.rankName, { color }]}>{rankName}</Text>
            </View>
          </View>
          <View style={styles.xpNumbers}>
            <Text style={styles.xpText}>
              {xpIntoLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()}
            </Text>
            <Text style={styles.xpLabel}>XP</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${xpPercent}%`, backgroundColor: color },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(xpPercent)}% to next level
          </Text>
        </View>
      </TouchableOpacity>

      {/* BEST SCORE - TROPHY CARD */}
      <View style={styles.bestCard}>
        <Text style={styles.trophyWatermark}>🏆</Text>
        <View style={styles.cornerAccent} />

        <View style={styles.recordBadge}>
          <Text style={styles.recordBadgeText}>YOUR RECORD</Text>
        </View>

        <View style={styles.scoreRow}>
          <Text style={styles.bestValue}>{bestScore}</Text>
          <Text style={styles.bestUnit}>Juggles</Text>
        </View>

        <View style={styles.personalBestBadge}>
          <Text style={styles.personalBestText}>Personal Best!</Text>
        </View>
      </View>

      {/* QUICK STATS */}
      <View style={styles.quickStatsRow}>
        <View style={[styles.quickStat, styles.statNavy]}>
          <View style={styles.statIconBg}>
            <Text style={styles.statIcon}>🎯</Text>
          </View>
          <Text style={styles.quickValue}>{sessions}</Text>
          <Text style={styles.quickLabel}>Training Sessions</Text>
        </View>

        <View style={[styles.quickStat, styles.statOrange]}>
          <View style={styles.statIconBg}>
            <Text style={styles.statIcon}>🔥</Text>
          </View>
          <Text style={styles.quickValue}>{streak}</Text>
          <Text style={styles.quickLabel}>Day Streak</Text>
        </View>
      </View>

      {/* DAILY CHALLENGE */}
      <View style={styles.challengeCard}>
        <View style={styles.challengeHeader}>
          <View style={styles.challengeTitleContainer}>
            <Text style={styles.challengeTitle}>Today's Challenge</Text>
          </View>
        </View>

        <View style={styles.missionBox}>
          <Text style={styles.missionLabel}>YOUR MISSION</Text>
          <Text style={styles.challengeDesc}>{challenge}</Text>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.push('/train')}
        >
          <Text style={styles.startButtonText}>LET'S GO!</Text>
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
    backgroundColor: '#F5F9FF',
  },
  container: {
    padding: 20,
    paddingTop: 30,
    backgroundColor: '#F5F9FF',
  },

  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  headerLeft: {
    flex: 1,
    marginRight: 15,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2C3E50',
    lineHeight: 34,
  },
  nameHighlight: {
    color: '#1E90FF',
  },
  avatarGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 35,
    backgroundColor: '#FFA500',
    opacity: 0.3,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: '#FFF',
  },

  // LEVEL / XP CARD
  levelCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2C3E50',
    lineHeight: 28,
  },
  rankName: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  xpNumbers: {
    alignItems: 'flex-end',
  },
  xpText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2C3E50',
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 2,
  },
  progressBarContainer: {
    gap: 8,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },

  // BEST SCORE
  bestCard: {
    backgroundColor: '#2B9FFF',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  trophyWatermark: {
    position: 'absolute',
    top: 10,
    right: 10,
    fontSize: 100,
    opacity: 0.15,
  },
  cornerAccent: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    transform: [{ rotate: '45deg' }],
  },
  recordBadge: {
    marginBottom: 12,
  },
  recordBadgeText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  bestValue: {
    color: '#FFFFFF',
    fontSize: 72,
    fontWeight: '900',
    lineHeight: 72,
    marginRight: 12,
  },
  bestUnit: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  personalBestBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    alignSelf: 'flex-start',
  },
  personalBestText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '800',
  },

  // QUICK STATS
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  quickStat: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statNavy: {
    backgroundColor: '#2C3E50',
  },
  statOrange: {
    backgroundColor: '#FFA500',
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
  },
  quickValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
  },
  quickLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '700',
    textAlign: 'center',
  },

  // DAILY CHALLENGE
  challengeCard: {
    backgroundColor: '#2C3E50',
    borderRadius: 24,
    padding: 24,
    marginBottom: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    position: 'relative',
  },
  challengeHeader: {
    marginBottom: 20,
  },
  challengeTitleContainer: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
  },
  missionBox: {
    backgroundColor: 'rgba(30, 144, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  missionLabel: {
    color: '#FFA500',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  challengeDesc: {
    fontSize: 15,
    color: '#FFF',
    lineHeight: 22,
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: '#FFA500',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 1,
  },
});
