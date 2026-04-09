import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useCoachTeamPlayerCounts(teamIds: string[]) {
  const key = teamIds.slice().sort().join(',');
  return useQuery({
    queryKey: ['coach-team-player-counts', key],
    enabled: teamIds.length > 0,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('team_id')
        .in('team_id', teamIds)
        .eq('is_coach', false);

      if (error) return {};

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        if (row.team_id) {
          counts[row.team_id] = (counts[row.team_id] ?? 0) + 1;
        }
      }
      return counts;
    },
  });
}
