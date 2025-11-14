import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

type Stats = {
  sessions: number;
  totalTime: number;
  improvement: number;
};

export function useStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['stats', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');

      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('duration_minutes, improvement')
        .eq('user_id', userId);

      if (error) throw error;

      const totalSessions = sessions?.length || 0;
      const totalTime =
        sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
      const avgImprovement =
        sessions && sessions.length > 0
          ? sessions.reduce((sum, s) => sum + (s.improvement || 0), 0) /
            sessions.length
          : 0;

      return {
        sessions: totalSessions,
        totalTime,
        improvement: Math.round(avgImprovement),
      } as Stats;
    },
    enabled: !!userId, // Only run query if userId exists
    staleTime: 1000 * 60 * 2, // Refetch stats after 2 minutes
  });
}
