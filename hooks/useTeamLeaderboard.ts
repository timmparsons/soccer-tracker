// hooks/useTeamLeaderboard.ts
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useTeamLeaderboard(teamId?: string) {
  return useQuery({
    queryKey: ['team-leaderboard', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          id,
          username,
          avatar_url,
          juggles (
            high_score,
            streak_days
          )
        `
        )
        .eq('team_id', teamId)
        .order('high_score', { foreignTable: 'juggles', ascending: false });

      if (error) throw error;

      return data.map((p: any) => ({
        id: p.id,
        username: p.username || 'Unnamed',
        avatar_url: p.avatar_url,
        high_score: p.juggles?.[0]?.high_score ?? 0,
        streak_days: p.juggles?.[0]?.streak_days ?? 0,
      }));
    },
  });
}
