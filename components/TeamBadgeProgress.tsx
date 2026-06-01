import type { TeamBadgeProgress } from '@/lib/checkTeamBadges';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TeamBadgeProgressProps {
  progress: TeamBadgeProgress;
}

export default function TeamBadgeProgressStrip({ progress }: TeamBadgeProgressProps) {
  const pct = Math.min(progress.qualifiedCount / progress.required, 1);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push('/(modals)/team-badges')}
      activeOpacity={0.85}
    >
      <Text style={styles.emoji}>{progress.icon}</Text>
      <View style={styles.content}>
        <Text style={styles.title}>
          <Text style={[styles.count, { color: progress.color }]}>
            {progress.playersNeeded} teammate{progress.playersNeeded !== 1 ? 's' : ''}
          </Text>
          {' '}away from{' '}
          <Text style={styles.badgeName}>{progress.name}</Text>
          {'!'}
        </Text>
        <View style={styles.barTrack}>
          <LinearGradient
            colors={['#1f89ee', '#ffb724']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.barFill, { width: `${pct * 100}%` as any }]}
          />
        </View>
        <Text style={styles.sub}>
          {progress.qualifiedCount}/{progress.required} players qualified · Tap to see all badges
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: {
    fontSize: 28,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
    lineHeight: 20,
  },
  count: {
    fontWeight: '900',
  },
  badgeName: {
    fontWeight: '900',
    color: '#1a1a2e',
  },
  barTrack: {
    height: 6,
    backgroundColor: '#F0F2F5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  sub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78909C',
  },
});
