import HomePage from '@/components/HomePage';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const index = () => {
  return (
    <SafeAreaView>
      <HomePage />
    </SafeAreaView>
  );
};

export default index;

const styles = StyleSheet.create({});
