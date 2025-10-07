import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import AchievementsSection from './AchievementsSection';
import Header from './Header';
import Hero from './Hero';
import QuickStartSection from './QuickStartSection';
import TipsSection from './TipsSection';
import WeekSection from './WeekSection';

const HomePage = () => {
  return (
    <ScrollView>
      <Header />
      <Hero />
      <QuickStartSection />
      <WeekSection />
      {/* <ProgressSection /> */}
      <AchievementsSection />
      <TipsSection />
    </ScrollView>
  );
};

export default HomePage;

const styles = StyleSheet.create({});
