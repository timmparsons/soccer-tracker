import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import {
  ChartSpline,
  House,
  Play,
  Settings,
  Trophy,
} from 'lucide-react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#ffb724',
        tabBarInactiveTintColor: '#95A5A6',
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 4,
          fontWeight: '600',
        },
        tabBarStyle: {
          borderTopColor: '#E5E7EB',
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          height: 60 + insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: profile?.is_coach ? 'Team' : 'Home',
          tabBarIcon: ({ color, size }) => (
            <House size={size ?? 28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='progress'
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <ChartSpline size={size ?? 28} color={color} />
          ),
          // Hide for coaches
          href: profile?.is_coach ? null : '/progress',
        }}
      />
      <Tabs.Screen
        name='train'
        options={{
          title: 'Train',
          tabBarIcon: ({ color, size }) => (
            <Play size={size ?? 28} color={color} />
          ),
          // Hide for coaches
          href: profile?.is_coach ? null : '/train',
        }}
      />
      <Tabs.Screen
        name='coach'
        options={{
          title: 'Coach',
          tabBarIcon: ({ color }) => (
            <Ionicons name='clipboard' size={24} color={color} />
          ),
          // Hide coach tab completely (index shows it for coaches)
          href: null,
        }}
      />
      <Tabs.Screen
        name='leaderboard'
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color, size }) => (
            <Trophy size={size ?? 28} color={color} />
          ),
          // Only show if user is on a team
          href: profile?.team_id ? '/leaderboard' : null,
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size ?? 28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
