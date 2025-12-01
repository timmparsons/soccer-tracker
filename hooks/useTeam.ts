import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useTeam(userId?: string) {
  return useQuery({
    queryKey: ['team', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    queryFn: async () => {
      console.log('🔍 Fetching team for user:', userId);

      // Get user's profile with team_id
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('team_id, username')
        .eq('id', userId)
        .single();

      console.log('📊 Profile result:', { profile, error: profileErr });

      if (profileErr) {
        console.error('❌ Profile error:', profileErr);
        throw profileErr;
      }

      if (!profile?.team_id) {
        console.log('⚠️ No team_id found in profile');
        return null;
      }

      // Get team details
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .eq('id', profile.team_id)
        .single();

      console.log('🏆 Team result:', { team, error: teamErr });

      if (teamErr) {
        console.error('❌ Team error:', teamErr);
        throw teamErr;
      }

      return team;
    },
  });
}
