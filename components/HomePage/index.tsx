import PageHeader from '@/components/common/PageHeader';
import LogSessionModal from '@/components/modals/LogSessionModal';
import { useProfile } from '@/hooks/useProfile';
import { useTouchTracking } from '@/hooks/useTouchTracking';
import { useUser } from '@/hooks/useUser';
import { getDisplayName } from '@/utils/getDisplayName';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const HomeScreen = () => {
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);

  const [modalVisible, setModalVisible] = useState(false);

  const {
    data: touchStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useTouchTracking(user?.id);

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchStats();
    }, [refetchProfile, refetchStats])
  );

  if (statsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#2B9FFF' />
      </View>
    );
  }

  const displayName = getDisplayName(profile);
  const todayTouches = touchStats?.today_touches || 0;
  const dailyTarget = touchStats?.daily_target || 1000;
  const weekTouches = touchStats?.this_week_touches || 0;
  const streak = touchStats?.current_streak || 0;
  const weekTpm = touchStats?.this_week_tpm || 0;
  const progressPercent = Math.min((todayTouches / dailyTarget) * 100, 100);

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
        title={`Hey ${displayName}! 👋`}
        subtitle='Ready to get some touches?'
        showAvatar={true}
        avatarUrl={profile?.avatar_url}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* DAILY PROGRESS CARD */}
        <View style={styles.progressCard}>
          <View style={styles.progressSparkle}>
            <Text style={styles.sparkleEmoji}>✨</Text>
          </View>
          <Text style={styles.progressLabel}>TODAY&apos;S PROGRESS</Text>
          <View style={styles.touchesRow}>
            <Text style={styles.touchesValue}>
              {todayTouches.toLocaleString()}
            </Text>
            <Text style={styles.touchesDivider}>/</Text>
            <Text style={styles.touchesTarget}>
              {dailyTarget.toLocaleString()}
            </Text>
          </View>
          <Text style={styles.touchesLabel}>touches</Text>

          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
            />
          </View>

          <Text style={styles.progressPercentText}>
            {Math.round(progressPercent)}% Complete
          </Text>
        </View>

        {/* LOG PRACTICE BUTTON */}
        <TouchableOpacity
          style={styles.logButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.logButtonContent}>
            <Ionicons name='add-circle' size={28} color='#FFF' />
            <Text style={styles.logButtonText}>LOG PRACTICE SESSION</Text>
          </View>
        </TouchableOpacity>

        {/* QUICK STATS */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statWeek]}>
            <View style={styles.statIconBg}>
              <Text style={styles.statIcon}>📊</Text>
            </View>
            <Text style={styles.statValue}>{weekTouches.toLocaleString()}</Text>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statSubtext}>Last 7 days</Text>
          </View>

          <View style={[styles.statCard, styles.statStreak]}>
            <View style={styles.statIconBg}>
              <Text style={styles.statIcon}>🔥</Text>
            </View>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
            <Text style={styles.statSubtext}>Keep it going!</Text>
          </View>

          <View style={[styles.statCard, styles.statBest]}>
            <View style={styles.statIconBg}>
              <Text style={styles.statIcon}>⚡</Text>
            </View>
            <Text style={styles.statValue}>{weekTpm}</Text>
            <Text style={styles.statLabel}>Touches/Min</Text>
            <Text style={styles.statSubtext}>{getTpmLabel(weekTpm)}</Text>
          </View>

          <View style={[styles.statCard, styles.statAvg]}>
            <View style={styles.statIconBg}>
              <Text style={styles.statIcon}>📈</Text>
            </View>
            <Text style={styles.statValue}>
              {weekTouches > 0
                ? Math.round(weekTouches / 7).toLocaleString()
                : 0}
            </Text>
            <Text style={styles.statLabel}>Daily Average</Text>
            <Text style={styles.statSubtext}>This week</Text>
          </View>
        </View>
      </ScrollView>

      {user?.id && (
        <LogSessionModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          userId={user.id}
          onSuccess={() => {
            refetchProfile();
            refetchStats();
          }}
        />
      )}
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

  // PROGRESS CARD
  progressCard: {
    backgroundColor: '#2B9FFF',
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#2B9FFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  progressSparkle: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  sparkleEmoji: {
    fontSize: 28,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 16,
    letterSpacing: 1.2,
  },
  touchesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  touchesValue: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 54,
  },
  touchesDivider: {
    fontSize: 36,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 8,
  },
  touchesTarget: {
    fontSize: 32,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  touchesLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFD54F',
    borderRadius: 6,
  },
  progressPercentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD54F',
    textAlign: 'center',
  },

  // LOG BUTTON
  logButton: {
    backgroundColor: '#FF7043',
    borderRadius: 20,
    paddingVertical: 22,
    marginBottom: 24,
    shadowColor: '#FF7043',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2,
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
    backgroundColor: '#FFF',
  },
  statStreak: {
    backgroundColor: '#FFF',
  },
  statBest: {
    backgroundColor: '#FFF',
  },
  statAvg: {
    backgroundColor: '#FFF',
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
