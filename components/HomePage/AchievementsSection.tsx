import { Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AchievementsTile from './AchievementsTile';

const AchievementsSection = () => {
  return (
    <View>
      <View style={styles.container}>
        <Text style={styles.header}>Latest Achievements</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tileSection}
      >
        <AchievementsTile
          icon={<Ionicons name='trophy' size={24} color='#fff' />}
          title='First 10!'
          backgroundColor='#facc15' // yellow
        />
        <AchievementsTile
          icon={<Ionicons name='star' size={24} color='#fff' />}
          title='5 Day Streak'
          backgroundColor='#22c55e' // green
        />
        <AchievementsTile
          icon={<Ionicons name='medal' size={24} color='#fff' />}
          title='Practice Champ'
          backgroundColor='#a855f7' // purple
        />
      </ScrollView>
    </View>
  );
};

export default AchievementsSection;

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  header: Typography.mainHeader,
  tileSection: {
    marginTop: Spacing.md,
  },
});
