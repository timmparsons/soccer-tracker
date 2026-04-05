import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface ArchivedSeasonPlayer {
  player_id: string;
  name: string;
  avatar_url: string | null;
  total_touches: number;
  rank: number;
}

export interface ArchivedSeason {
  id: string;
  team_id: string;
  season_number: number;
  season_start_date: string;
  season_end_date: string;
  final_team_xp: number;
  final_team_level: number;
  player_standings: ArchivedSeasonPlayer[];
  created_at: string;
}

export function useArchivedSeasons(teamId: string | null | undefined) {
  return useQuery<ArchivedSeason[]>({
    queryKey: ['archived-seasons', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('archived_team_seasons')
        .select('*')
        .eq('team_id', teamId!)
        .order('season_number', { ascending: false });

      if (error) return [];
      return (data ?? []) as ArchivedSeason[];
    },
  });
}
