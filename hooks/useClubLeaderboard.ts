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

export function useClubLeaderboard(clubId?: string, period: 'week' | 'alltime' = 'week') {
  const todayObj = new Date();
  const weekStartObj = new Date(todayObj);
  weekStartObj.setDate(todayObj.getDate() - todayObj.getDay());
  const weekStart = getLocalDate(weekStartObj);
  const today = getLocalDate();

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
        .select('user_id, touches_logged')
        .in('user_id', playerIds);

      if (period === 'week') {
        query = query.gte('date', weekStart).lte('date', today);
      }

      const { data: sessions } = await query;

      const totals: Record<string, number> = {};
      for (const s of sessions ?? []) {
        totals[s.user_id] = (totals[s.user_id] ?? 0) + s.touches_logged;
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
        .sort((a, b) => b.touches - a.touches);
    },
  });
}
