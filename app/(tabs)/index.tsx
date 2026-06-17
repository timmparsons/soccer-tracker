import HomeScreen from '@/components/HomePage';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import CoachDashboard from './coach';

export default function Index() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);

  if (userLoading || profileLoading) {
    return <View style={styles.blank} />;
  }

  if (profile?.is_coach) {
    return <CoachDashboard key={profile.team_id} />;
  }

  return <HomeScreen />;
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
});
