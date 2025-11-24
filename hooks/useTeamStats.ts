// hooks/useTeamStats.ts
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useTeamStats(teamId?: string) {
  return useQuery({
    queryKey: ['team-stats', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_team_stats', {
        team_id_input: teamId,
      });

      if (error) throw error;
      return data;
    },
  });
}
