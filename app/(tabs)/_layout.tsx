import { usePlayerCoachChallenges } from '@/hooks/useCoachChallenges';
import { useProfile } from '@/hooks/useProfile';
import { usePlayerChallenges } from '@/hooks/usePlayerChallenges';
import { useUser } from '@/hooks/useUser';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs } from 'expo-router';
import {
  ChartSpline,
  House,
  Play,
  Settings,
  Swords,
} from 'lucide-react-native';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ViewMode = 'coach' | 'player';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export const ViewModeContext = createContext<ViewModeContextType>({
  viewMode: 'coach',
  setViewMode: () => {},
});

export const useViewMode = () => useContext(ViewModeContext);

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const [viewMode, setViewModeState] = useState<ViewMode>('coach');

  // Load persisted view mode on mount
  useEffect(() => {
    AsyncStorage.getItem('viewMode').then((stored) => {
      if (stored === 'coach' || stored === 'player') {
        setViewModeState(stored);
      }
    });
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    AsyncStorage.setItem('viewMode', mode);
  };

  const isPlayer = !profile?.is_coach;
  const { data: coachChallenges } = usePlayerCoachChallenges(isPlayer ? user?.id : undefined);
  const { data: playerChallenges } = usePlayerChallenges(isPlayer ? user?.id : undefined);

  const activeCoachChallenges = coachChallenges?.filter((c) => c.status === 'active').length ?? 0;
  const pendingPlayerChallenges = playerChallenges?.filter(
    (c) => c.status === 'pending' && c.challenged_id === user?.id,
  ).length ?? 0;
  const challengeBadge = activeCoachChallenges + pendingPlayerChallenges || undefined;

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#ffb724',
          tabBarInactiveTintColor: '#95A5A6',
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
          },
          tabBarStyle: {
            borderTopColor: '#E5E7EB',
            paddingTop: 8,
            paddingBottom: insets.bottom + 8,
            height: 65 + insets.bottom,
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
            // Always hidden from tab bar (index.tsx renders it)
            href: null,
          }}
        />
        <Tabs.Screen
          name='leaderboard'
          options={{
            title: 'Compete',
            tabBarIcon: ({ color, size }) => (
              <Swords size={size ?? 28} color={color} />
            ),
            href: profile?.team_id ? '/leaderboard' : null,
            tabBarBadge: challengeBadge,
            tabBarBadgeStyle: { top: -6, right: -8 },
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
    </ViewModeContext.Provider>
  );
}
