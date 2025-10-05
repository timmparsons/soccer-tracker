import { ScrollView, StyleSheet } from 'react-native';

import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomePage from '../../components/HomePage';

export default function HomeScreen() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
      }}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          backgroundColor: '#f9f9f9',
          padding: 20,
        }}
      >
        <HomePage />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
});
