import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useTeam(userId?: string) {
  return useQuery({
    queryKey: ['team', userId],
    enabled: !!userId,
    queryFn: async () => {
      console.log('🔍 useTeam called with userId:', userId);

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('team_id, username')
        .eq('id', userId)
        .single();

      console.log('🔍 Profile result:', profile, profileErr);

      if (profileErr) throw profileErr;
      if (!profile?.team_id) {
        console.log('⚠️ No team_id found in profile');
        return null;
      }

      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .eq('id', profile.team_id)
        .single();

      console.log('🔍 Team result:', team, teamErr);

      if (teamErr) throw teamErr;
      return team;
    },
  });
}
