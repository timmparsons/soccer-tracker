import { type ChallengeNotificationItem } from '@/components/common/PageHeader';
import { usePlayerCoachChallenges } from '@/hooks/useCoachChallenges';
import { useGroupChallenges } from '@/hooks/useGroupChallenges';
import { usePlayerChallenges } from '@/hooks/usePlayerChallenges';
import { useProfile } from '@/hooks/useProfile';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

export function useChallengeNotifications(onPressOverride?: () => void): ChallengeNotificationItem[] {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const isPlayer = !profile?.is_coach;

  const { data: playerChallenges = [] } = usePlayerChallenges(isPlayer ? user?.id : undefined);
  const { data: coachChallenges = [] } = usePlayerCoachChallenges(isPlayer ? user?.id : undefined);
  const { data: groupChallenges = [] } = useGroupChallenges(isPlayer ? user?.id : undefined);

  const handlePress = useCallback(() => {
    if (onPressOverride) {
      onPressOverride();
    } else {
      router.push('/(tabs)/train');
    }
  }, [onPressOverride, router]);

  return useMemo((): ChallengeNotificationItem[] => {
    if (!user?.id || !isPlayer) return [];
    const items: ChallengeNotificationItem[] = [];

    for (const c of playerChallenges) {
      if (c.status === 'pending' && c.challenged_id === user.id) {
        items.push({
          id: c.id,
          title: `${c.challenger_name ?? 'Someone'} challenged you`,
          subtitle: `${c.touches_target} touches · ${c.time_limit_hours}h to complete`,
          onPress: handlePress,
        });
      }
    }

    for (const c of coachChallenges) {
      if (c.status === 'active' && !c.accepted_at) {
        items.push({
          id: c.id,
          title: 'New coach challenge',
          subtitle: `${c.touches_target.toLocaleString()} touches · Due ${c.due_date}`,
          onPress: handlePress,
        });
      }
    }

    for (const gc of groupChallenges) {
      const me = gc.participants.find((p) => p.user_id === user.id);
      const deadlinePassed = new Date() > new Date(gc.deadline_at);
      const allDone = gc.participants.every((p) => p.completed_at !== null);
      if (!deadlinePassed && !allDone && me?.completed_at === null) {
        items.push({
          id: gc.id,
          title: 'Group challenge awaiting you',
          subtitle: `${gc.touches_target} touches`,
          onPress: handlePress,
        });
      }
    }

    return items;
  }, [user?.id, isPlayer, playerChallenges, coachChallenges, groupChallenges, handlePress]);
}
