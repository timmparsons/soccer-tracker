import PageHeader from '@/components/common/PageHeader';
import VinnieCard from '@/components/common/VinnieCard';
import TodayChallengeCard from '@/components/HomePage/TodayChallengeCard';
import LogSessionModal from '@/components/modals/LogSessionModal';
import VinnieCelebrationModal from '@/components/modals/VinnieCelebrationModal';
import { useProfile } from '@/hooks/useProfile';
import { useChallengeStats, useTouchTracking } from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { getDisplayName } from '@/utils/getDisplayName';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const HomeScreen = () => {
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);

  const [modalVisible, setModalVisible] = useState(false);
  const [challengeDrillId, setChallengeDrillId] = useState<
    string | undefined
  >();
  const [challengeDurationMinutes, setChallengeDurationMinutes] = useState<
    number | undefined
  >();
  const [challengeName, setChallengeName] = useState<string | undefined>();
  const [challengeDifficulty, setChallengeDifficulty] = useState<
    string | undefined
  >();
  const [vinnieVisible, setVinnieVisible] = useState(false);
  const [vinnieTouches, setVinnieTouches] = useState(0);
  const [vinnieIsChallenge, setVinnieIsChallenge] = useState(false);
  const [vinnieDrillName, setVinnieDrillName] = useState<string | undefined>();

  const queryClient = useQueryClient();

  const {
    data: touchStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useTouchTracking(user?.id);

  const { data: challengeStats, refetch: refetchChallengeStats } =
    useChallengeStats(user?.id, undefined);

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchStats();
      refetchChallengeStats();
    }, [refetchProfile, refetchStats, refetchChallengeStats]),
  );

  if (statsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#2B9FFF' />
      </View>
    );
  }

  const displayName = getDisplayName(profile);
  const weekTouches = touchStats?.this_week_touches || 0;
  const streak = touchStats?.current_streak || 0;
  const weekTpm = touchStats?.this_week_tpm || 0;
  const challengeStreak = challengeStats?.challengeStreak || 0;

  // TPM intensity indicator
  const getTpmLabel = (tpm: number) => {
    if (tpm === 0) return 'No data';
    if (tpm < 30) return 'Slow pace';
    if (tpm < 50) return 'Moderate';
    if (tpm < 80) return 'Good tempo!';
    return 'Game speed!';
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={`Hey ${displayName}!`}
        subtitle='Ready to get some touches?'
        showAvatar={true}
        avatarUrl={profile?.avatar_url}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* VINNIE */}
        <VinnieCard
          trainedToday={(touchStats?.today_touches || 0) > 0}
          streak={streak}
        />

        {/* TODAY'S CHALLENGE */}
        {user?.id && (
          <TodayChallengeCard
            userId={user.id}
            onStartChallenge={(
              drillId,
              durationMinutes,
              drillName,
              difficulty,
            ) => {
              setChallengeDrillId(drillId);
              setChallengeDurationMinutes(durationMinutes);
              setChallengeName(drillName);
              setChallengeDifficulty(difficulty);
              setModalVisible(true);
            }}
          />
        )}

        {/* QUICK STATS */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statWeek]}>
            <View style={[styles.statIconBg, { backgroundColor: '#DBEAFE' }]}>
              <Text style={styles.statIcon}>📊</Text>
            </View>
            <Text style={[styles.statValue, { color: '#2B9FFF' }]}>
              {weekTouches.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statSubtext}>Last 7 days</Text>
          </View>

          <View style={[styles.statCard, styles.statStreak]}>
            <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.statIcon}>🔥</Text>
            </View>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {streak}
            </Text>
            <Text style={styles.statLabel}>Day Streak</Text>
            <Text style={styles.statSubtext}>Keep it going!</Text>
          </View>

          <View style={[styles.statCard, styles.statBest]}>
            <View style={[styles.statIconBg, { backgroundColor: '#FFE4DC' }]}>
              <Text style={styles.statIcon}>⚡</Text>
            </View>
            <Text style={[styles.statValue, { color: '#FF7043' }]}>
              {weekTpm}
            </Text>
            <Text style={styles.statLabel}>Touches/Min</Text>
            <Text style={styles.statSubtext}>{getTpmLabel(weekTpm)}</Text>
          </View>

          <View style={[styles.statCard, styles.statAvg]}>
            <View style={[styles.statIconBg, { backgroundColor: '#D1FAE5' }]}>
              <Text style={styles.statIcon}>⚽</Text>
            </View>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {challengeStreak}
            </Text>
            <Text style={styles.statLabel}>Challenge Streak</Text>
            <Text style={styles.statSubtext}>
              {challengeStreak === 0
                ? "Do today's challenge!"
                : 'Days in a row'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {user?.id && (
        <LogSessionModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setChallengeDrillId(undefined);
            setChallengeDurationMinutes(undefined);
            setChallengeName(undefined);
            setChallengeDifficulty(undefined);
          }}
          userId={user.id}
          challengeDrillId={challengeDrillId}
          challengeDurationMinutes={challengeDurationMinutes}
          challengeName={challengeName}
          challengeDifficulty={challengeDifficulty}
          onSuccess={() => {
            refetchProfile();
            refetchStats();
            refetchChallengeStats();
            queryClient.invalidateQueries({ queryKey: ['challenge-stats'] });
          }}
          onSessionLogged={(tc, isChallenge, drillName) => {
            setVinnieTouches(tc);
            setVinnieIsChallenge(isChallenge);
            setVinnieDrillName(drillName);
            setVinnieVisible(true);
          }}
        />
      )}

      <VinnieCelebrationModal
        visible={vinnieVisible}
        touchCount={vinnieTouches}
        isChallenge={vinnieIsChallenge}
        drillName={vinnieDrillName}
        streak={streak}
        challengeStreak={challengeStreak}
        onClose={() => setVinnieVisible(false)}
      />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 20,
  },

  // STATS GRID (2x2)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statWeek: {
    backgroundColor: '#F0F8FF',
    borderTopWidth: 4,
    borderTopColor: '#2B9FFF',
  },
  statStreak: {
    backgroundColor: '#FFFBF0',
    borderTopWidth: 4,
    borderTopColor: '#F59E0B',
  },
  statBest: {
    backgroundColor: '#FFF8F6',
    borderTopWidth: 4,
    borderTopColor: '#FF7043',
  },
  statAvg: {
    backgroundColor: '#F0FDF9',
    borderTopWidth: 4,
    borderTopColor: '#10B981',
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
  },
});
