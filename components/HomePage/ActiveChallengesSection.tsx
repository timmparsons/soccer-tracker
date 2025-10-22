import { Spacing, Typography } from '@/constants/theme';
import { CircleUserRound } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import WideTile from '../common/WideTile';

const ActiveChallengesSection = () => {
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Active Challenges</Text>
      </View>
      <WideTile
        icon={CircleUserRound}
        iconColor='black'
        iconBackground='white'
        title='No challenges yet'
        subtitle='2 hours left'
        backgroundColor='#fefce9'
      />
    </View>
  );
};

export default ActiveChallengesSection;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
  },
  headerContainer: {
    marginTop: Spacing.md,
    // paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  header: Typography.mainHeader,
  tileSection: {
    marginTop: Spacing.md,
  },
});
