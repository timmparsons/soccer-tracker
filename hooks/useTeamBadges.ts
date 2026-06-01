import { supabase } from '@/lib/supabase';
import { getTeamBadge, TeamBadgeDefinition } from '@/lib/teamBadges';
import { useQuery } from '@tanstack/react-query';

export interface EarnedTeamBadge {
  id: string;
  badge_type: string;
  week_start: string | null;
  earned_at: string;
  definition: TeamBadgeDefinition;
}

export function useTeamBadges(teamId: string | undefined) {
  return useQuery<EarnedTeamBadge[]>({
    queryKey: ['team-badges', teamId],
    enabled: !!teamId,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_badges')
        .select('id, badge_type, week_start, earned_at')
        .eq('team_id', teamId!)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      return (data ?? [])
        .map((row) => {
          const definition = getTeamBadge(row.badge_type);
          if (!definition) return null;
          return { ...row, definition };
        })
        .filter((r): r is EarnedTeamBadge => r !== null);
    },
  });
}
