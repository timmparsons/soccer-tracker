import { supabase } from '@/lib/supabase';
import { getGlobalDisplayName } from '@/utils/globalLeaderboardName';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface GlobalPlayer {
  userId: string;
  name: string;
  cityState: string | null;
  touches: number;
  avatar_url: string | null;
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
        .select('id, name, display_name, avatar_url, hometown_city, hometown_state')
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
          const city = (p as any)?.hometown_city as string | null | undefined;
          const state = (p as any)?.hometown_state as string | null | undefined;
          const cityState = city && state ? `${city}, ${state}` : city || null;
          return {
            userId,
            name: getGlobalDisplayName(rawName),
            cityState: cityState ?? null,
            touches,
            avatar_url: p?.avatar_url ?? null,
          };
        })
        .sort((a, b) => b.touches - a.touches)
        .slice(0, 100);
    },
  });
}
