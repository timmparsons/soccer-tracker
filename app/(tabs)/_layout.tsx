import { Tabs } from 'expo-router';
import {
  ChartSpline,
  House,
  Play,
  Settings,
  Trophy,
} from 'lucide-react-native';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2ECC71', // Soccer green
        tabBarInactiveTintColor: '#95A5A6', // Gray for inactive
        tabBarStyle: {
          borderTopColor: '#E5E7EB',
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Home',
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
            <ChartSpline color={color} size={size ?? 28} />
          ),
        }}
      />
      <Tabs.Screen
        name='train'
        options={{
          title: 'Train',
          tabBarIcon: ({ color, size }) => (
            <Play size={size ?? 28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='leaderboard'
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color, size }) => (
            <Trophy size={size ?? 28} color={color} />
          ),
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
