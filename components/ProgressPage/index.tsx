import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ProgressPage from './Progress';

const index = () => {
  return (
    <View style={styles.container}>
      <Text>Tim</Text>
      <ProgressPage />
    </View>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
