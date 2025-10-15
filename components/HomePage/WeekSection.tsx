import { Spacing, Typography } from '@/constants/theme';
import { router } from 'expo-router';
import { CalendarDays, Trophy } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Tile from '../common/Tile';

const WeekSection = () => {
  return (
    <View style={styles.tilesSection}>
      <Text style={styles.header}>This Week</Text>
      <View style={styles.tilesContainer}>
        <Tile
          icon={CalendarDays}
          iconColor='#2563eb'
          iconBackground='#dbeafe'
          title='5'
          subtitle='Practice Days'
          onPress={() => router.push('/progress')}
        />
        <Tile
          icon={Trophy}
          iconColor='#16a34a'
          iconBackground='#dcfce7'
          title='3 '
          subtitle='New Records'
          onPress={() => router.push('/progress')}
        />
      </View>
    </View>
  );
};

export default WeekSection;

const styles = StyleSheet.create({
  tilesSection: {
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  header: Typography.mainHeader,
  tiles: {
    paddingHorizontal: 10,
    marginTop: 20,
  },
  tilesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
