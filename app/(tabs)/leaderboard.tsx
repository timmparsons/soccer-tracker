import LeaderboardPage from '@/components/Leaderboard';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Progress = () => {
  return (
    <SafeAreaView style={styles.container}>
      <LeaderboardPage />
    </SafeAreaView>
  );
};

export default Progress;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});
