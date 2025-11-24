import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import TimerPage from './TimerPage';

const index = () => {
  return (
    <ScrollView style={styles.container}>
      <TimerPage />
    </ScrollView>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    backgroundColor: '#f9fafb',
  },
});
