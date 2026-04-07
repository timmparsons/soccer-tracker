import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface GlobalPlayer {
  id: string;
  name: string;
  avatar_url: string | null;
  team_name: string | null;
  weekly_touches: number;
}

export function useGlobalLeaderboard() {
  return useQuery({
    queryKey: ['global-leaderboard'],
    staleTime: 2 * 60 * 1000, // 2 min — global data changes less urgently
    queryFn: async (): Promise<GlobalPlayer[]> => {
      const todayObj = new Date();
      const weekStartObj = new Date(todayObj);
      weekStartObj.setDate(todayObj.getDate() - todayObj.getDay()); // Sunday
      const weekStart = getLocalDate(weekStartObj);
      const today = getLocalDate();

      // Fetch all non-coach, onboarded players with their team name
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url, teams(name)')
        .eq('is_coach', false)
        .eq('onboarding_completed', true);

      if (profilesError || !profiles || profiles.length === 0) return [];

      const profileIds = profiles.map((p) => p.id);

      // Fetch this week's sessions for all players in one query
      const { data: sessions } = await supabase
        .from('daily_sessions')
        .select('user_id, touches_logged')
        .in('user_id', profileIds)
        .gte('date', weekStart)
        .lte('date', today);

      const touchesByUser: Record<string, number> = {};
      for (const s of sessions ?? []) {
        touchesByUser[s.user_id] = (touchesByUser[s.user_id] ?? 0) + s.touches_logged;
      }

      return profiles
        .map((p): GlobalPlayer => ({
          id: p.id,
          name: p.display_name || p.name || 'Player',
          avatar_url: p.avatar_url,
          team_name: (p.teams as { name: string } | null)?.name ?? null,
          weekly_touches: touchesByUser[p.id] ?? 0,
        }))
        .sort((a, b) => b.weekly_touches - a.weekly_touches);
    },
  });
}
