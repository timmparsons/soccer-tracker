import HomeScreen from '@/components/HomePage';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import CoachDashboard from './coach';

export default function Index() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);

  // Show loading while checking user role
  if (userLoading || profileLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size='large' color='#1f89ee' />
      </View>
    );
  }

  // Show coach dashboard if user is a coach
  if (profile?.is_coach) {
    return <CoachDashboard />;
  }

  // Show regular homepage for players
  return <HomeScreen />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
  },
});
