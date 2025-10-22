import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Star } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const AppHeader = () => {
  const userData = {
    name: 'Tim',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/png?seed=Alex',
    level: 8,
    streak: 7,
    totalStars: 1247,
    currentXP: 1747,
    nextLevelXP: 2500,
  };

  const progressPercent = (userData.currentXP / userData.nextLevelXP) * 100;
  const xpToNextLevel = userData.nextLevelXP - userData.currentXP;

  return (
    <LinearGradient
      colors={['#2563eb', '#1e40af']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.topRow}>
        {/* Avatar + Info */}
        <View style={styles.leftSide}>
          <Image source={{ uri: userData.avatarUrl }} style={styles.avatar} />

          <View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>Hey, {userData.name}!</Text>
              <Text style={styles.wave}>👋</Text>
            </View>

            <View style={styles.badgesRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>Level {userData.level}</Text>
              </View>
              <View style={styles.streakBadge}>
                <Flame size={14} color='#fff' fill='#fff' />
                <Text style={styles.streakText}>
                  {userData.streak} day streak
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stars */}
        <View style={styles.rightSide}>
          <View style={styles.starRow}>
            <Star size={20} color='#fde047' fill='#fde047' />
            <Text style={styles.starCount}>
              {userData.totalStars.toLocaleString()}
            </Text>
          </View>
          <Text style={styles.starLabel}>Total Stars</Text>
        </View>
      </View>

      {/* Progress Bar */}
      {/* <View style={styles.progressBarWrapper}>
        <View style={styles.progressBarBg}>
          <View
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>
        <Text style={styles.xpText}>
          {xpToNextLevel} XP to Level {userData.level + 1}
        </Text>
      </View> */}
    </LinearGradient>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  container: {
    padding: 30,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  wave: {
    fontSize: 18,
    marginLeft: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  levelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  streakText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starCount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 4,
  },
  starLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  progressBarWrapper: {
    marginTop: 12,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#facc15',
  },
  xpText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
