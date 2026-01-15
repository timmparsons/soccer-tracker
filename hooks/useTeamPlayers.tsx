import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useTeamPlayers(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-players', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      if (!teamId) return [];

      // Get all profiles on this team
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('team_id', teamId);

      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) return [];

      // Get juggle stats for all these players
      const userIds = profiles.map((p) => p.id);
      const { data: juggles, error: jugglesError } = await supabase
        .from('juggles')
        .select('*')
        .in('user_id', userIds);

      if (jugglesError) throw jugglesError;

      // Combine profiles with their stats
      return profiles.map((profile) => ({
        ...profile,
        stats: juggles?.find((j) => j.user_id === profile.id) || null,
      }));
    },
  });
}
