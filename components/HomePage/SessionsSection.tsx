import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Spacing, Typography } from '../../constants/theme';

const SessionsSection = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Recent Sessions</Text>
    </View>
  );
};

export default SessionsSection;

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
  },
  header: Typography.mainHeader,
});
