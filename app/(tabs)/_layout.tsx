import { useUnviewedReactions } from '@/hooks/useActivityReactions';
import { usePlayerCoachChallenges } from '@/hooks/useCoachChallenges';
import { useGroupChallenges } from '@/hooks/useGroupChallenges';
import { usePlayerChallenges } from '@/hooks/usePlayerChallenges';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import {
  ChartSpline,
  House,
  Play,
  Settings,
  Swords,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);

  const isPlayer = !profile?.is_coach;
  const { data: coachChallenges } = usePlayerCoachChallenges(
    isPlayer ? user?.id : undefined,
  );
  const { data: playerChallenges } = usePlayerChallenges(
    isPlayer ? user?.id : undefined,
  );
  const { data: groupChallenges } = useGroupChallenges(
    isPlayer ? user?.id : undefined,
  );

  const activeCoachChallenges =
    coachChallenges?.filter((c) => c.status === 'active').length ?? 0;
  const pendingPlayerChallenges =
    playerChallenges?.filter(
      (c) => c.status === 'pending' && c.challenged_id === user?.id,
    ).length ?? 0;
  const challengeBadge =
    activeCoachChallenges + pendingPlayerChallenges || undefined;

  const hasLive1v1 = playerChallenges?.some((c) => {
    if (c.status !== 'accepted') return false;
    const isChallenger = c.challenger_id === user?.id;
    return isChallenger ? !c.challenger_completed_at : !c.challenged_completed_at;
  }) ?? false;

  const hasUnstartedGroupChallenge = groupChallenges?.some((gc) => {
    const me = gc.participants.find((p) => p.user_id === user?.id);
    const deadlinePassed = new Date() > new Date(gc.deadline_at);
    const allDone = gc.participants.every((p) => p.completed_at !== null);
    return (
      gc.status === 'active' &&
      !deadlinePassed &&
      !allDone &&
      me?.completed_at === null
    );
  });

  const trainBadge = hasLive1v1 || hasUnstartedGroupChallenge ? '' : undefined;

  const { data: unviewedReactions = [] } = useUnviewedReactions(isPlayer ? user?.id : undefined);
  const homeBadge = unviewedReactions.length > 0 ? '' : undefined;

  return (
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
            tabBarBadge: homeBadge,
            tabBarBadgeStyle: {
              top: 0,
              right: -2,
              minWidth: 8,
              width: 8,
              height: 8,
              borderRadius: 4,
              paddingHorizontal: 0,
              fontSize: 0,
            },
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
            tabBarBadge: trainBadge,
            tabBarBadgeStyle: {
              top: 0,
              right: -2,
              minWidth: 8,
              width: 8,
              height: 8,
              borderRadius: 4,
              paddingHorizontal: 0,
              fontSize: 0,
            },
          }}
        />
        <Tabs.Screen
          name='coach'
          options={{
            title: 'Team',
            tabBarIcon: ({ color }) => (
              <Ionicons name='clipboard' size={24} color={color} />
            ),
            // Always hidden from tab bar (index.tsx renders it for coaches)
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
            href: '/leaderboard',
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
  );
}
