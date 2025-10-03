import { StyleSheet, View } from 'react-native';

import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomePage from '../../components/HomePage';

export default function HomeScreen() {
  return (
    <SafeAreaView>
      <View style={styles.container}>
        <HomePage />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
});
