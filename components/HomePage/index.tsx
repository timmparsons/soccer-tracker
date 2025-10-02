import React from 'react';
import { StyleSheet, View } from 'react-native';
import Header from './Header';
import Streak from './Streak';

const HomePage = () => {
  return (
    <View>
      <Header />
      <Streak />
    </View>
  );
};

export default HomePage;

const styles = StyleSheet.create({});
