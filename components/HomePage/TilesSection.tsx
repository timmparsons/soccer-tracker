import React from 'react';
import { StyleSheet, View } from 'react-native';
import Tile from './Tile';

const TilesSection = () => {
  return (
    <View style={styles.tiles}>
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
  );
};

export default TilesSection;

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 20,
  },
});
