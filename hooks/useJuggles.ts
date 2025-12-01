import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useJuggles(userId: string | undefined) {
  return useQuery({
    queryKey: ['juggles', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('juggles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes - prevents unnecessary refetching
    gcTime: 1000 * 60 * 10, // 10 minutes - keeps data in cache longer
  });
}
