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

export function useGlobalLeaderboard(period: 'today' | 'week' | 'last_week' | 'alltime' = 'today') {
  const todayObj = new Date();
  const weekStartObj = new Date(todayObj);
  weekStartObj.setDate(todayObj.getDate() - todayObj.getDay());
  const weekStart = getLocalDate(weekStartObj);
  const today = getLocalDate();

  const lastWeekEndObj = new Date(weekStartObj);
  lastWeekEndObj.setDate(weekStartObj.getDate() - 1);
  const lastWeekStartObj = new Date(lastWeekEndObj);
  lastWeekStartObj.setDate(lastWeekEndObj.getDate() - 6);
  const lastWeekStart = getLocalDate(lastWeekStartObj);
  const lastWeekEnd = getLocalDate(lastWeekEndObj);

  return useQuery({
    queryKey: ['global-leaderboard', period, weekStart],
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<GlobalPlayer[]> => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url, hometown_city, hometown_state')
        .eq('is_coach', false)
        .eq('onboarding_completed', true);

      if (!profiles || profiles.length === 0) return [];

      const profileIds = profiles.map((p) => p.id);

      let query = supabase
        .from('daily_sessions')
        .select('user_id, touches_logged, date')
        .in('user_id', profileIds);

      if (period === 'today') {
        query = query.eq('date', today).limit(10000);
      } else if (period === 'week') {
        query = query.gte('date', weekStart).lte('date', today).limit(10000);
      } else if (period === 'last_week') {
        query = query.gte('date', lastWeekStart).lte('date', lastWeekEnd).limit(10000);
      } else {
        // Best Week — needs full history, high explicit limit like the team
        // leaderboard (PostgREST silently caps at 1000 rows otherwise).
        query = query.limit(50000);
      }

      const { data: sessions } = await query;

      const totals: Record<string, number> = {};
      if (period === 'alltime') {
        const weekTotalsByUser: Record<string, Record<string, number>> = {};
        for (const s of sessions ?? []) {
          const d = new Date(s.date + 'T00:00:00');
          d.setDate(d.getDate() - d.getDay());
          const wk = getLocalDate(d);
          const userWeeks = (weekTotalsByUser[s.user_id] ??= {});
          userWeeks[wk] = (userWeeks[wk] ?? 0) + s.touches_logged;
        }
        for (const [userId, weeks] of Object.entries(weekTotalsByUser)) {
          totals[userId] = Object.values(weeks).reduce((max, v) => (v > max ? v : max), 0);
        }
      } else {
        for (const s of sessions ?? []) {
          totals[s.user_id] = (totals[s.user_id] ?? 0) + s.touches_logged;
        }
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
        .sort((a, b) => b.touches - a.touches || a.name.localeCompare(b.name))
        .slice(0, 100);
    },
  });
}
