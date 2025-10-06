import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Tile from './Tile';

const WeekSection = () => {
  return (
    <View style={styles.tiles}>
      <Text>This Week</Text>
      <View style={styles.tilesContainer}>
        <Tile
          icon='play'
          iconColor='#2563eb'
          iconBackground='#dbeafe'
          title='Start Practice'
          subtitle='Begin new session'
        />
        <Tile
          icon='stats-chart'
          iconColor='#16a34a'
          iconBackground='#dcfce7'
          title='View Progress'
          subtitle='See your growth'
        />
      </View>
    </View>
  );
};

export default WeekSection;

const styles = StyleSheet.create({
  tiles: {
    paddingHorizontal: 10,
    marginTop: 20,
  },
  tilesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
