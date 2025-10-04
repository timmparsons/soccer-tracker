import { Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import BadgesTile from './BadgesTile';

const BadgesSection = () => {
  return (
    <View>
      <View style={styles.container}>
        <Text>Your Badges</Text>
        <Text>View All</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tileSection}
      >
        <BadgesTile
          icon={<Ionicons name='trophy' size={24} color='#fff' />}
          title='First 10!'
          backgroundColor='#facc15' // yellow
        />
        <BadgesTile
          icon={<Ionicons name='star' size={24} color='#fff' />}
          title='5 Day Streak'
          backgroundColor='#22c55e' // green
        />
        <BadgesTile
          icon={<Ionicons name='medal' size={24} color='#fff' />}
          title='Practice Champ'
          backgroundColor='#a855f7' // purple
        />
      </ScrollView>
    </View>
  );
};

export default BadgesSection;

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.margin,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tileSection: {
    marginTop: Spacing.margin / 2,
  },
});
