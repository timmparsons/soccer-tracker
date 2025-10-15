import { Spacing, Typography } from '@/constants/theme';
import { router } from 'expo-router';
import { Flame, Medal } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GradientTile from '../common/GradientTile';
import WideTile from '../common/WideTile';

const AchievementsSection = () => {
  return (
    <View>
      <View style={styles.container}>
        <Text style={styles.header}>Latest Achievements</Text>
      </View>
      <View style={{ padding: 16 }}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/progress')}>
          <GradientTile
            icon={Medal}
            title='First 50 Juggles!'
            subtitle='Earned 2 hours ago'
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(tabs)/progress')}>
          <WideTile
            icon={Flame}
            iconColor='#8630d0ff'
            iconBackground='#cfa7f3ff'
            title='5 Day streak'
            subtitle='Keet it up champion!'
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AchievementsSection;

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  header: Typography.mainHeader,
  tileSection: {
    marginTop: Spacing.md,
  },
});
