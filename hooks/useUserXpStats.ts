import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface UserXpStats {
  today_xp: number;
  weekly_xp: number;
}

export function useUserXpStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-xp-stats', userId],
    queryFn: async (): Promise<UserXpStats> => {
      const todayStr = getLocalDate();
      const todayStart = new Date(todayStr + 'T00:00:00').toISOString();

      const weekStartObj = new Date();
      weekStartObj.setDate(new Date().getDate() - new Date().getDay());
      weekStartObj.setHours(0, 0, 0, 0);
      const weekStart = weekStartObj.toISOString();

      const [{ data: weekRows }, { data: todayRows }] = await Promise.all([
        supabase
          .from('xp_events')
          .select('xp_amount')
          .eq('user_id', userId!)
          .gte('created_at', weekStart),
        supabase
          .from('xp_events')
          .select('xp_amount')
          .eq('user_id', userId!)
          .gte('created_at', todayStart),
      ]);

      return {
        weekly_xp: (weekRows ?? []).reduce((sum, r) => sum + r.xp_amount, 0),
        today_xp: (todayRows ?? []).reduce((sum, r) => sum + r.xp_amount, 0),
      };
    },
    enabled: !!userId,
  });
}
