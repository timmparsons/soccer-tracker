import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type SessionData = {
  user_id: string;
  duration_minutes: number;
  improvement: number;
};

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionData: SessionData) => {
      const { data, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
