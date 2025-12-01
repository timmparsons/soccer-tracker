// hooks/useTeamLeaderboard.ts
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useTeamLeaderboard(teamId?: string) {
  return useQuery({
    queryKey: ['team-leaderboard', teamId],
    enabled: !!teamId,
    // staleTime: 1000 * 60 * 2, // 2 minutes - refresh leaderboard periodically
    queryFn: async () => {
      // First, get all profiles in the team
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('team_id', teamId);
      console.log('Fetched profiles for team leaderboard:', profiles);
      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) return [];

      // Then get juggles data for all those users
      const userIds = profiles.map((p) => p.id);
      console.log('Fetching juggles for user IDs:', userIds);
      const { data: juggles, error: jugglesError } = await supabase
        .from('juggles')
        .select('user_id, high_score, streak_days')
        .in('user_id', userIds);

      console.log('Fetched juggles for team leaderboard:', juggles);

      if (jugglesError) throw jugglesError;

      // Combine the data
      const leaderboard = profiles.map((profile) => {
        const juggle = juggles?.find((j) => j.user_id === profile.id);
        return {
          id: profile.id,
          username: profile.username || 'Unnamed',
          avatar_url: profile.avatar_url,
          high_score: juggle?.high_score ?? 0,
          streak_days: juggle?.streak_days ?? 0,
        };
      });

      // Sort by high_score descending
      return leaderboard.sort((a, b) => b.high_score - a.high_score);
    },
  });
}
