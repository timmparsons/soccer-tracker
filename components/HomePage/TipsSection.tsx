import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Spacing, Typography } from '../../constants/theme';
import GradientTile from '../common/GradientTile';

const TipsSection = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Soccer Tips</Text>
      <View style={styles.tileSection}>
        <GradientTile
          title='Did you know?'
          subtitle='Practicing with both feet can improve your overall ball control and versatility on the field.'
          colors={['#45cd9bff', '#156480ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          padding={50}
        />
      </View>
    </View>
  );
};

export default TipsSection;

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  header: Typography.mainHeader,
  tileSection: {
    marginTop: Spacing.md,
  },
});
