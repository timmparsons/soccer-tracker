import { Spacing, Typography } from '@/constants/theme';
import { router } from 'expo-router';
import { Shuffle, Timer } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Tile from '../common/Tile';

const QuickTileSection = () => {
  return (
    <View style={styles.tilesSection}>
      {/* <Text style={styles.header}>This Week</Text> */}
      <View style={styles.tilesContainer}>
        <Tile
          icon={Timer}
          iconColor='#16a34a'
          iconBackground='#dcfce7'
          title='Practice Timer'
          subtitle='Start Tracking'
          onPress={() => router.push('/progress')}
        />
        <Tile
          icon={Shuffle}
          iconColor='#8b34ea'
          iconBackground='#f2e9ff'
          title='Quick Drill '
          subtitle='Random Challenge'
          onPress={() => router.push('/progress')}
        />
      </View>
    </View>
  );
};

export default QuickTileSection;

const styles = StyleSheet.create({
  tilesSection: {
    paddingTop: Spacing.sm,
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
