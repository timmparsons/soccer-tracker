// hooks/useTeamLeaderboard.ts
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useTeamLeaderboard(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-leaderboard', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      if (!teamId) return [];

      // Get all profiles on this team (exclude coaches)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_coach', false); // ✅ Only get players, not coaches

      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) return [];

      // Get juggle stats for these players
      const userIds = profiles.map((p) => p.id);
      const { data: juggles, error: jugglesError } = await supabase
        .from('juggles')
        .select('*')
        .in('user_id', userIds);

      if (jugglesError) throw jugglesError;

      // Combine profiles with stats and sort by high_score
      const leaderboard = profiles
        .map((profile) => {
          const stats = juggles?.find((j) => j.user_id === profile.id);
          return {
            ...profile,
            high_score: stats?.high_score || 0,
            streak_days: stats?.streak_days || 0,
          };
        })
        .sort((a, b) => b.high_score - a.high_score);

      return leaderboard;
    },
  });
}
