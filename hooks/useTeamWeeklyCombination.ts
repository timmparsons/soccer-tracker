import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useTeamWeeklyCombination(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['team-weekly-combination', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data } = await supabase
        .from('teams')
        .select('weekly_combination')
        .eq('id', teamId!)
        .single();
      return ((data as any)?.weekly_combination ?? null) as string | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
