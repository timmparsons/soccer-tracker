import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Tabs } from 'expo-router';
import {
  CalendarDays,
  ChartSpline,
  House,
  Settings,
  Trophy,
} from 'lucide-react-native';
import React from 'react';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#2ECC71', // Soccer green
        tabBarInactiveTintColor: '#95A5A6', // Gray for inactive
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          borderTopColor: '#E5E7EB',
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
        name='sessions'
        options={{
          title: 'Sessions',
          tabBarIcon: ({ color, size }) => (
            <CalendarDays size={size ?? 28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='awards'
        options={{
          title: 'Awards',
          tabBarIcon: ({ color, size }) => (
            <Trophy size={size ?? 28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='settings'
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size ?? 28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
