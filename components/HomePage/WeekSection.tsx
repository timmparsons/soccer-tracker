import { Spacing, Typography } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const WeekSection = () => {
  return (
    <View style={{ marginTop: Spacing.md }}>
      {/* Title outside the tile */}
      <Text style={styles.header}>This Week</Text>

      {/* Tile */}
      <View style={styles.tileContainer}>
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>12</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#2196F3' }]}>
              2h 45mins
            </Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>15%</Text>
            <Text style={styles.statLabel}>Improvement</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default WeekSection;

const styles = StyleSheet.create({
  header: {
    ...Typography.mainHeader,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.lg,
  },
  tileContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: Spacing.lg,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  statLabel: {
    marginTop: 4,
    color: '#666',
  },
});
