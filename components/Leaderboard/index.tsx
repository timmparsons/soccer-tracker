import React from 'react';
import { StyleSheet, View } from 'react-native';
import MainSection from './MainSection';

const TrainPage = () => {
  return (
    <View style={styles.container}>
      <MainSection />
    </View>
  );
};

export default TrainPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});
