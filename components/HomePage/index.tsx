import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import AchievementsSection from './AchievementsSection';
import Header from './Header';
import Hero from './Hero';
import ProgressSection from './ProgressSection';
import QuickStartSection from './QuickStartSection';
import SessionsSection from './SessionsSection';
import WeekSection from './WeekSection';

const HomePage = () => {
  return (
    <ScrollView>
      <Header />
      <Hero />
      <QuickStartSection />
      <WeekSection />
      <ProgressSection />
      <AchievementsSection />
      <SessionsSection />
    </ScrollView>
  );
};

export default HomePage;

const styles = StyleSheet.create({});
