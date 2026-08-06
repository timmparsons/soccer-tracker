import { supabase } from '@/lib/supabase';
import { getGlobalDisplayName } from '@/utils/globalLeaderboardName';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface GlobalJugglingPlayer {
  userId: string;
  name: string;
  cityState: string | null;
  high_score: number;
  date_achieved: string;
  avatar_url: string | null;
}

export function useGlobalJugglingLeaderboard(period: 'week' | 'alltime' = 'week') {
  const todayObj = new Date();
  const weekStartObj = new Date(todayObj);
  weekStartObj.setDate(todayObj.getDate() - todayObj.getDay());
  const weekStart = getLocalDate(weekStartObj);
  const today = getLocalDate();

  return useQuery({
    queryKey: ['global-juggling-leaderboard', period, weekStart],
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<GlobalJugglingPlayer[]> => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url, hometown_city, hometown_state')
        .eq('is_coach', false)
        .eq('onboarding_completed', true);

      if (!profiles || profiles.length === 0) return [];

      const profileIds = profiles.map((p) => p.id);

      let query = supabase
        .from('daily_sessions')
        .select('user_id, juggle_count, date')
        .in('user_id', profileIds)
        .not('juggle_count', 'is', null)
        .gt('juggle_count', 0);

      if (period === 'week') {
        query = query.gte('date', weekStart).lte('date', today).limit(10000);
      } else {
        query = query.limit(50000);
      }

      const { data: sessions } = await query;

      const best: Record<string, { high_score: number; date_achieved: string }> = {};
      for (const s of sessions ?? []) {
        const current = best[s.user_id];
        if (!current || s.juggle_count > current.high_score) {
          best[s.user_id] = { high_score: s.juggle_count, date_achieved: s.date };
        }
      }

      const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

      return Object.entries(best)
        .map(([userId, record]) => {
          const p = profileMap[userId];
          const rawName = p?.name || p?.display_name || 'Player';
          const city = (p as any)?.hometown_city as string | null | undefined;
          const state = (p as any)?.hometown_state as string | null | undefined;
          const cityState = city && state ? `${city}, ${state}` : city || null;
          return {
            userId,
            name: getGlobalDisplayName(rawName),
            cityState: cityState ?? null,
            high_score: record.high_score,
            date_achieved: record.date_achieved,
            avatar_url: p?.avatar_url ?? null,
          };
        })
        .sort((a, b) => b.high_score - a.high_score)
        .slice(0, 100);
    },
  });
}
