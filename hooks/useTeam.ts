import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface Team {
  id: string;
  name: string;
  code: string;
  coach_id: string;
  team_xp: number;
  team_level: number;
  created_at: string;
}

export function useTeam(userId: string | undefined) {
  return useQuery<Team | null>({
    queryKey: ['team', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;

      // First get the user's team_id from their profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', userId)
        .single();

      if (profileError || !profile?.team_id) return null;

      // Then fetch the team details
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', profile.team_id)
        .single();

      if (teamError) throw teamError;
      return team as Team;
    },
  });
}
