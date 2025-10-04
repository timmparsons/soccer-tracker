import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Heading, Spacing } from '../../constants/theme';

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
    marginTop: Spacing.margin,
  },
  header: Heading.mainHeader,
});
