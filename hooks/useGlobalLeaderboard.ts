import { supabase } from '@/lib/supabase';
import { getGlobalDisplayName } from '@/utils/globalLeaderboardName';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface GlobalPlayer {
  userId: string;
  name: string;
  touches: number;
}

export function useGlobalLeaderboard() {
  const todayObj = new Date();
  const weekStartObj = new Date(todayObj);
  weekStartObj.setDate(todayObj.getDate() - todayObj.getDay());
  const weekStart = getLocalDate(weekStartObj);
  const today = getLocalDate();

  return useQuery({
    queryKey: ['global-leaderboard', weekStart],
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<GlobalPlayer[]> => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, display_name, hometown_city, hometown_state')
        .eq('is_coach', false)
        .eq('onboarding_completed', true);

      if (!profiles || profiles.length === 0) return [];

      const profileIds = profiles.map((p) => p.id);

      const { data: sessions } = await supabase
        .from('daily_sessions')
        .select('user_id, touches_logged')
        .in('user_id', profileIds)
        .gte('date', weekStart)
        .lte('date', today)
        .limit(10000);

      const totals: Record<string, number> = {};
      for (const s of sessions ?? []) {
        totals[s.user_id] = (totals[s.user_id] ?? 0) + s.touches_logged;
      }

      const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

      return Object.entries(totals)
        .filter(([, touches]) => touches > 0)
        .map(([userId, touches]) => {
          const p = profileMap[userId];
          const rawName = p?.name || p?.display_name || 'Player';
          return {
            userId,
            name: getGlobalDisplayName(
              rawName,
              (p as any)?.hometown_city,
              (p as any)?.hometown_state,
            ),
            touches,
          };
        })
        .sort((a, b) => b.touches - a.touches)
        .slice(0, 100);
    },
  });
}
