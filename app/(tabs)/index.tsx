import HomeScreen from '@/components/HomePage';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { useUser } from '@/hooks/useUser';
import React, { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import CoachDashboard from './coach';
import { ViewModeContext } from './_layout';

export default function Index() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const { isCoach, isLoading: subLoading } = useSubscription();
  const { viewMode } = useContext(ViewModeContext);

  if (userLoading || profileLoading || subLoading) {
    return <View style={styles.blank} />;
  }

  if (profile?.is_coach && isCoach && viewMode === 'coach') {
    return <CoachDashboard />;
  }

  return <HomeScreen />;
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
});
