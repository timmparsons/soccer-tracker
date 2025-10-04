import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Progress from 'react-native-progress';

const ProgressTile = () => {
  const streak = 5;
  const bestToday = 23;
  const goal = 30;
  const progress = bestToday / goal; // 0.65

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.iconWrapper}>
          <Ionicons name='flame' size={22} color='#f97316' />
        </View>
        <View style={styles.streakContainer}>
          <Text style={styles.label}>Practice Streak</Text>
          <Text style={styles.value}>{streak} Days</Text>
        </View>
        <View style={styles.bestContainer}>
          <Text style={styles.label}>Best Today</Text>
          <Text style={styles.bestValue}>{bestToday} Juggles</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <Progress.Bar
        progress={progress}
        width={null} // makes it full width inside container
        height={10}
        borderRadius={5}
        color='#2563eb'
        unfilledColor='#e5e7eb'
        borderWidth={0}
        style={styles.progress}
      />

      {/* Goal Text */}
      <Text style={styles.subtitle}>
        {Math.round(progress * 100)}% to your daily goal of {goal} juggles
      </Text>
    </View>
  );
};

export default ProgressTile;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    margin: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    backgroundColor: '#fee2e2',
    borderRadius: 50,
    padding: 8,
    marginRight: 10,
  },
  streakContainer: {
    flex: 1,
  },
  bestContainer: {
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  bestValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  progress: {
    marginVertical: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
});
