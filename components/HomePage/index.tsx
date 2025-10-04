import React from 'react';
import { StyleSheet, View } from 'react-native';
import BadgesSection from './BadgesSection';
import Header from './Header';
import Hero from './Hero';
import ProgressSection from './ProgressSection';
import SessionsSection from './SessionsSection';
import TilesSection from './TilesSection';

const HomePage = () => {
  return (
    <View>
      <Header />
      <Hero />
      <TilesSection />
      <ProgressSection />
      <BadgesSection />
      <SessionsSection />
    </View>
  );
};

export default HomePage;

const styles = StyleSheet.create({});
