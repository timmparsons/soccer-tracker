import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface ClubJugglingPlayer {
  id: string;
  name: string;
  avatar_url: string | null;
  team_name: string;
  high_score: number;
  date_achieved: string;
}

export function useClubJugglingLeaderboard(clubId?: string, period: 'week' | 'alltime' = 'week') {
  const todayObj = new Date();
  const weekStartObj = new Date(todayObj);
  weekStartObj.setDate(todayObj.getDate() - todayObj.getDay());
  const weekStart = getLocalDate(weekStartObj);
  const today = getLocalDate();

  return useQuery({
    queryKey: ['club-juggling-leaderboard', clubId, period],
    enabled: !!clubId,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<ClubJugglingPlayer[]> => {
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
        .select('user_id, juggle_count, date')
        .in('user_id', playerIds)
        .not('juggle_count', 'is', null)
        .gt('juggle_count', 0);

      if (period === 'week') {
        query = query.gte('date', weekStart).lte('date', today);
      }

      const { data: sessions } = await query;

      const best: Record<string, { high_score: number; date_achieved: string }> = {};
      for (const s of sessions ?? []) {
        const current = best[s.user_id];
        if (!current || s.juggle_count > current.high_score) {
          best[s.user_id] = { high_score: s.juggle_count, date_achieved: s.date };
        }
      }

      return players
        .filter((p) => (best[p.id]?.high_score ?? 0) > 0)
        .map((p) => ({
          id: p.id,
          name: p.name || p.display_name || 'Player',
          avatar_url: p.avatar_url,
          team_name: (p.teams as any)?.name ?? '',
          high_score: best[p.id].high_score,
          date_achieved: best[p.id].date_achieved,
        }))
        .sort((a, b) => b.high_score - a.high_score || a.name.localeCompare(b.name));
    },
  });
}
