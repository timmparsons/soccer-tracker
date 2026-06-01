import { supabase } from '@/lib/supabase';
import { EarnedWeeklyBadge } from '@/lib/teamBadges';
import { useQuery } from '@tanstack/react-query';

export function useTeamBadges(teamId: string | undefined) {
  return useQuery<EarnedWeeklyBadge[]>({
    queryKey: ['team-badges', teamId],
    enabled: !!teamId,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_badges')
        .select('id, team_id, badge_type, week_start, earned_at')
        .eq('team_id', teamId!)
        .order('week_start', { ascending: false });

      if (error) throw error;
      return (data ?? []) as EarnedWeeklyBadge[];
    },
  });
}
