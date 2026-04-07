import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface CoachTeam {
  id: string;
  name: string;
  code: string;
  season_number: number;
  season_start_date: string | null;
  created_at: string;
}

export function useCoachTeams(userId: string | undefined) {
  return useQuery({
    queryKey: ['coach-teams', userId],
    enabled: !!userId,
    queryFn: async (): Promise<CoachTeam[]> => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, code, season_number, season_start_date, created_at')
        .eq('coach_id', userId!)
        .order('created_at', { ascending: true });

      if (error) return [];
      return data ?? [];
    },
  });
}
