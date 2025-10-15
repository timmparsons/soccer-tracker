import { Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const HeroSection = () => {
  return (
    <LinearGradient
      colors={['#3b82f6', '#2563eb']} // Tailwind blue-500 → blue-600
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.title}>Ready to Practice?</Text>
      <Text style={styles.subtitle}>
        Keep juggling and become a soccer star!
      </Text>

      <View style={styles.card}>
        <View style={styles.avatarWrapper}>
          <Image
            source={require('../../assets/images/soccer-boy.png')}
            style={styles.avatar}
            resizeMode='contain'
          />
        </View>
        <Text style={styles.score}>47</Text>
        <Text style={styles.scoreLabel}>High Score</Text>
      </View>
    </LinearGradient>
  );
};

export default HeroSection;

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0f2fe',
    marginBottom: 30,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  avatarWrapper: {
    backgroundColor: '#fff',
    borderRadius: 100,
    padding: 20,
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
  },
  score: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  scoreLabel: {
    fontSize: 16,
    color: '#e0f2fe',
    marginTop: 4,
  },
});
