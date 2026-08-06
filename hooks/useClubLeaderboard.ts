import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface ClubPlayer {
  id: string;
  name: string;
  avatar_url: string | null;
  team_name: string;
  touches: number;
}

export function useClubLeaderboard(
  clubId?: string,
  period: 'today' | 'week' | 'last_week' | 'alltime' = 'today',
) {
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
    queryKey: ['club-leaderboard', clubId, period],
    enabled: !!clubId,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<ClubPlayer[]> => {
      const { data: players } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url, teams(name)')
        .eq('club_id', clubId!)
        .eq('is_coach', false)
        .eq('onboarding_completed', true);

      if (!players?.length) return [];

      const playerIds = players.map((p) => p.id);

      let query = supabase
        .from('daily_sessions')
        .select('user_id, touches_logged, date')
        .in('user_id', playerIds);

      if (period === 'today') {
        query = query.eq('date', today);
      } else if (period === 'week') {
        query = query.gte('date', weekStart).lte('date', today);
      } else if (period === 'last_week') {
        query = query.gte('date', lastWeekStart).lte('date', lastWeekEnd);
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

      return players
        .filter((p) => (totals[p.id] ?? 0) > 0)
        .map((p) => ({
          id: p.id,
          name: p.name || p.display_name || 'Player',
          avatar_url: p.avatar_url,
          team_name: (p.teams as any)?.name ?? '',
          touches: totals[p.id] ?? 0,
        }))
        .sort((a, b) => b.touches - a.touches || a.name.localeCompare(b.name));
    },
  });
}
