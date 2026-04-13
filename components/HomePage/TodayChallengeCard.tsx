import DrillVideoModal from '@/components/modals/DrillVideoModal';
import { useChallengeStats, useTodayChallenge } from '@/hooks/useTouchTracking';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface TodayChallengeCardProps {
  userId: string;
  totalTouches: number;
  onStartChallenge: (
    drillId: string,
    durationMinutes: number,
    drillName: string,
    difficulty: string,
  ) => void;
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  beginner: { bg: '#E8F5E9', text: '#388E3C' },
  intermediate: { bg: '#FFF3E0', text: '#F57C00' },
  advanced: { bg: '#FFEBEE', text: '#D32F2F' },
};

const TIER_THRESHOLDS = [
  { tier: 'beginner',     next: 'Intermediate', threshold: 10_000 },
  { tier: 'intermediate', next: 'Advanced',     threshold: 50_000 },
];

const getTierProgress = (totalTouches: number) => {
  if (totalTouches >= 50_000) return null; // fully unlocked
  const current = TIER_THRESHOLDS.find((t) => totalTouches < t.threshold)!;
  const prev = current.tier === 'beginner' ? 0 : 10_000;
  const pct = Math.min((totalTouches - prev) / (current.threshold - prev), 1);
  const remaining = (current.threshold - totalTouches).toLocaleString();
  return { next: current.next, threshold: current.threshold, pct, remaining };
};

const TodayChallengeCard = ({
  userId,
  totalTouches,
  onStartChallenge,
}: TodayChallengeCardProps) => {
  const router = useRouter();
  const { data: challenge, isLoading: challengeLoading } = useTodayChallenge(userId);
  const { data: stats } = useChallengeStats(userId, challenge?.id);
  const [videoVisible, setVideoVisible] = useState(false);

  if (challengeLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size='small' color='#31af4d' />
      </View>
    );
  }

  if (!challenge) return null;

  const durationMinutes = Math.round(challenge.challenge_duration_seconds / 60);
  const difficulty = challenge.difficulty_level as string;
  const difficultyStyle = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS['beginner'];
  const completedToday = stats?.completedToday ?? false;
  const tierProgress = getTierProgress(totalTouches);

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.headerLabel}>TODAY&apos;S CHALLENGE</Text>

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

        {challenge.video_url ? (
          <TouchableOpacity
            style={styles.thumbnailContainer}
            onPress={() => setVideoVisible(true)}
            activeOpacity={0.85}
          >
            {challenge.thumbnail_url ? (
              <Image
                source={{ uri: challenge.thumbnail_url }}
                style={styles.thumbnail}
                resizeMode='cover'
              />
            ) : (
              <View style={styles.thumbnailPlaceholder} />
            )}
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Ionicons name='play' size={22} color='#FFF' />
              </View>
              <Text style={styles.watchLabel}>Watch Video</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={styles.videoComingSoon}>📹 Video coming soon</Text>
        )}

        {/* Tier progress */}
        {tierProgress ? (
          <View style={styles.tierProgress}>
            <View style={styles.tierProgressHeader}>
              <Text style={styles.tierProgressLabel}>
                🔓 {tierProgress.remaining} touches to unlock {tierProgress.next}
              </Text>
              <Text style={styles.tierProgressPct}>
                {Math.round(tierProgress.pct * 100)}%
              </Text>
            </View>
            <View style={styles.tierProgressTrack}>
              <View style={[styles.tierProgressFill, { width: `${tierProgress.pct * 100}%` as any }]} />
            </View>
          </View>
        ) : (
          <View style={styles.tierUnlocked}>
            <Text style={styles.tierUnlockedText}>🔓 All challenge tiers unlocked!</Text>
          </View>
        )}

        {completedToday ? (
          <>
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>Completed today! 🎉</Text>
            </View>
            <TouchableOpacity
              style={styles.keepTrainingButton}
              onPress={() => router.push('/(tabs)/train')}
              activeOpacity={0.8}
            >
              <Text style={styles.keepTrainingText}>Keep Training →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => onStartChallenge(challenge.id, durationMinutes, challenge.name, difficulty)}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>Start Challenge</Text>
          </TouchableOpacity>
        )}
      </View>

      <DrillVideoModal
        visible={videoVisible}
        onClose={() => setVideoVisible(false)}
        videoUrl={challenge.video_url ?? ''}
        drillName={challenge.name}
      />
    </>
  );
};

export default TodayChallengeCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
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
    marginBottom: 12,
  },
  thumbnailContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    height: 160,
    backgroundColor: '#E8F5E9',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8F5E9',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1f89ee',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  watchLabel: {
    color: '#1a1a2e',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  videoComingSoon: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B0BEC5',
    marginBottom: 8,
  },
  tierProgress: {
    marginBottom: 12,
  },
  tierProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tierProgressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
    flex: 1,
  },
  tierProgressPct: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1f89ee',
  },
  tierProgressTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  tierProgressFill: {
    height: '100%',
    backgroundColor: '#1f89ee',
    borderRadius: 3,
  },
  tierUnlocked: {
    marginBottom: 12,
    alignItems: 'center',
  },
  tierUnlockedText: {
    fontSize: 12,
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
  completedBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  completedBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#31af4d',
  },
  keepTrainingButton: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  keepTrainingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
