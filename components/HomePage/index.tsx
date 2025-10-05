import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import BadgesSection from './BadgesSection';
import Header from './Header';
import Hero from './Hero';
import ProgressSection from './ProgressSection';
import SessionsSection from './SessionsSection';
import TilesSection from './TilesSection';

const HomePage = () => {
  return (
    <ScrollView>
      <Header />
      <Hero />
      <TilesSection />
      <ProgressSection />
      <BadgesSection />
      <SessionsSection />
    </ScrollView>
  );
};

export default HomePage;

const styles = StyleSheet.create({});
