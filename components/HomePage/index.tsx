import { useStats } from '@/hooks/useStats';
import { useUser } from '@/hooks/useUser';
import React from 'react';
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
  const { data: user, isLoading: userLoading } = useUser();
  const { data: stats, isLoading: statsLoading } = useStats(user?.id);

  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#007AFF' />
      </View>
    );
  }
  console.log('User-QQQ:', user);
  console.log('Stats-QQQ:', stats);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Good Morning,{' '}
          {user?.user_metadata?.username ||
            user?.email?.split('@')[0] ||
            'Player'}{' '}
          👋
        </Text>
        <Image
          source={require('../../assets/images/soccer-boy.png')}
          style={styles.avatar}
        />
      </View>

      {/* Daily Challenge */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Challenge</Text>
        <Text style={styles.challengeName}>Keep It Up Challenge</Text>
        <Text style={styles.challengeDesc}>
          Juggle the ball 25 times without dropping it bhere
        </Text>
        <TouchableOpacity style={styles.startButton}>
          <Text style={styles.startButtonText}>Start Challenge</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {statsLoading ? '...' : stats?.sessions ?? 0}
          </Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {statsLoading ? '...' : `${stats?.totalTime ?? 0}`}
          </Text>
          <Text style={styles.statLabel}>Total Time (mins)</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {statsLoading ? '...' : `${stats?.improvement ?? 0}%`}
          </Text>
          <Text style={styles.statLabel}>Improvement</Text>
        </View>
      </View>

      {/* Coach's Tip */}
      <View style={styles.tipContainer}>
        <Text style={styles.tipTitle}>Coach Tip</Text>
        <Text style={styles.tipText}>
          Keep your eyes on the ball and use both feet to stay balanced.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
  },
  container: {
    padding: 20,
    backgroundColor: '#f7f9fc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 40,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    marginBottom: 20,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111',
  },
  challengeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  challengeDesc: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  statLabel: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
  },
  tipContainer: {
    backgroundColor: '#e8f4ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  tipTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
    color: '#007AFF',
  },
  tipText: {
    color: '#333',
    fontSize: 14,
  },
  signOutButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  signOutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default HomeScreen;
