import { Typography } from '@/constants/theme';
import { CalendarDays, Trophy } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Tile from '../common/Tile';

const WeekSection = () => {
  return (
    <View style={styles.tiles}>
      <Text style={styles.header}>This Week</Text>
      <View style={styles.tilesContainer}>
        <Tile
          icon={CalendarDays}
          iconColor='#2563eb'
          iconBackground='#dbeafe'
          title='5'
          subtitle='Practice Days'
        />
        <Tile
          icon={Trophy}
          iconColor='#16a34a'
          iconBackground='#dcfce7'
          title='3 '
          subtitle='New Records'
        />
      </View>
    </View>
  );
};

export default WeekSection;

const styles = StyleSheet.create({
  header: Typography.mainHeader,
  tiles: {
    paddingHorizontal: 10,
    marginTop: 20,
  },
  tilesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
