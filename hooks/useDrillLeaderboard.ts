import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface DrillLeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  best_time: number;
  rank: number;
}

export function useDrillLeaderboard(
  drillId: string | undefined,
  touchesTarget: number,
  teamId: string | undefined,
) {
  return useQuery({
    queryKey: ['drill-leaderboard', drillId, touchesTarget, teamId],
    enabled: !!drillId && !!teamId,
    staleTime: 60_000,
    queryFn: async (): Promise<DrillLeaderboardEntry[]> => {
      const { data: members } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', teamId!)
        .eq('is_coach', false);

      if (!members?.length) return [];
      const memberIds = members.map((m) => m.id);

      const { data: attempts } = await supabase
        .from('drill_attempts')
        .select('user_id, time_seconds')
        .eq('drill_id', drillId!)
        .eq('touches_target', touchesTarget)
        .in('user_id', memberIds)
        .order('time_seconds', { ascending: true });

      if (!attempts?.length) return [];

      const bestMap = new Map<string, number>();
      for (const a of attempts as { user_id: string; time_seconds: number }[]) {
        if (!bestMap.has(a.user_id)) {
          bestMap.set(a.user_id, a.time_seconds);
        }
      }

      return Array.from(bestMap.entries())
        .map(([userId, bestTime]) => {
          const member = members.find((m) => m.id === userId);
          return {
            user_id: userId,
            name: (member as Record<string, string>)?.display_name || (member as Record<string, string>)?.name || 'Player',
            avatar_url: (member as Record<string, string | null>)?.avatar_url ?? null,
            best_time: bestTime,
            rank: 0,
          };
        })
        .sort((a, b) => a.best_time - b.best_time)
        .map((e, i) => ({ ...e, rank: i + 1 }));
    },
  });
}
