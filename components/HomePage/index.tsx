import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import DailyChallengeCard from './DailyChallengeCard';
import Header from './Header';
import QuickTileSection from './QuickTileSection';
import TipsSection from './TipsSection';
import WeekSection from './WeekSection';

const HomePage = () => {
  return (
    <ScrollView>
      <Header />
      <DailyChallengeCard
        title='Daily Challenge'
        challengeName='Keep It Up Challenge'
        description='Juggle the ball 25 times without dropping it'
        duration='10 mins'
        difficulty='Medium'
        reward={50}
        icon={require('../../assets/images/soccer-boy.png')}
        onPress={() => console.log('Start challenge!')}
      />
      <QuickTileSection />
      <WeekSection />
      {/* <ProgressSection /> */}
      {/* <ActiveChallengesSection /> */}
      {/* <AchievementsSection /> */}
      <TipsSection />
    </ScrollView>
  );
};

export default HomePage;

const styles = StyleSheet.create({});
