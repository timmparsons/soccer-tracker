import { supabase } from '@/lib/supabase';
import { DEFAULT_WEEKLY_GOAL_DAYS } from '@/lib/weeklyGoal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const useWeeklyGoal = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['weekly-goal', userId],
    queryFn: async (): Promise<number> => {
      if (!userId) throw new Error('No user ID');

      const { data } = await supabase
        .from('user_targets')
        .select('weekly_goal_days')
        .eq('user_id', userId)
        .maybeSingle();

      return data?.weekly_goal_days || DEFAULT_WEEKLY_GOAL_DAYS;
    },
    enabled: !!userId,
  });
};

export const useSetWeeklyGoal = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (days: number) => {
      if (!userId) throw new Error('No user ID');

      const { error } = await supabase
        .from('user_targets')
        .upsert({ user_id: userId, weekly_goal_days: days }, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: (_data, days) => {
      queryClient.setQueryData(['weekly-goal', userId], days);
    },
  });
};
