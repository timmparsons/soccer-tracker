import { pickSquadBadgeForDate } from '@/lib/squadBadges';
import { getLocalDate } from '@/utils/getLocalDate';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TeamUnlockProgressBarProps {
  completedCount: number;
  rosterSize: number;
}

const TeamUnlockProgressBar = ({ completedCount, rosterSize }: TeamUnlockProgressBarProps) => {
  if (rosterSize === 0) return null;

  const pct = Math.min(1, completedCount / rosterSize);
  const allDone = completedCount >= rosterSize;
  const remaining = rosterSize - completedCount;
  const badge = pickSquadBadgeForDate(getLocalDate());

  return (
    <View style={styles.card}>
      <Text style={styles.label}>DAILY SPRINT — TEAM PROGRESS</Text>
      <Text style={styles.statusLine}>
        <Text style={styles.ratioText}>{completedCount}/{rosterSize} Players Done</Text>
        {allDone ? (
          <Text style={styles.unlockText}> • {badge.name} unlocked! 🎉</Text>
        ) : (
          <Text style={styles.unlockText}>
            {' '}• {remaining} more player{remaining === 1 ? '' : 's'} needed to unlock today&apos;s {badge.name}!
          </Text>
        )}
      </Text>

      <View style={styles.track}>
        <LinearGradient
          colors={allDone ? ['#31af4d', '#1f89ee'] : ['#ffb724', '#1f89ee']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${Math.max(pct * 100, completedCount > 0 ? 6 : 0)}%` }]}
        />
      </View>
    </View>
  );
};

export default TeamUnlockProgressBar;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78909C',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statusLine: {
    marginBottom: 10,
  },
  ratioText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  unlockText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F0F4F8',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});
