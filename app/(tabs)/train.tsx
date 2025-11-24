import TrainPage from '@/components/TrainPage';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Play = () => {
  return (
    <SafeAreaView style={styles.container}>
      <TrainPage />
    </SafeAreaView>
  );
};

export default Play;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});
