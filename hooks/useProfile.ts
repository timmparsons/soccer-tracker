import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: typeof userId === 'string',
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*, teams(*)')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
  });
}
