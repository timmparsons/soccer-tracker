import HomeScreen from '@/components/HomePage';
import SplashScreen from '@/components/SplashScreen';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import React from 'react';
import CoachDashboard from './coach';

export default function Index() {
  const { data: user, isLoading: userLoading } = useUser();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);

  // Show loading while checking user role
  if (userLoading || profileLoading) {
    return <SplashScreen />;
  }

  // Show coach dashboard if user is a coach
  if (profile?.is_coach) {
    return <CoachDashboard />;
  }

  // Show regular homepage for players
  return <HomeScreen />;
}
