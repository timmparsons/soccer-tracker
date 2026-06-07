import { supabase } from '@/lib/supabase';
import { ADDITIONAL_TRAINING_DAILY_CAP } from '@/lib/xp';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface AdditionalTrainingSession {
  id: string;
  category: string;
  duration_minutes: number;
  xp_awarded: number;
  completed_at: string;
}

export function useAdditionalTraining(userId: string | undefined) {
  return useQuery({
    queryKey: ['additional-training', userId],
    queryFn: async () => {
      const today = getLocalDate();
      const todayStart = new Date(today + 'T00:00:00').toISOString();
      const todayEnd = new Date(today + 'T23:59:59').toISOString();

      const { data, error } = await supabase
        .from('additional_training_sessions')
        .select('id, category, duration_minutes, xp_awarded, completed_at')
        .eq('user_id', userId!)
        .gte('completed_at', todayStart)
        .lte('completed_at', todayEnd)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const sessions: AdditionalTrainingSession[] = data ?? [];
      const todayXp = sessions.reduce((sum, s) => sum + s.xp_awarded, 0);
      const remaining = Math.max(0, ADDITIONAL_TRAINING_DAILY_CAP - todayXp);

      return { sessions, todayXp, remaining };
    },
    enabled: !!userId,
  });
}
