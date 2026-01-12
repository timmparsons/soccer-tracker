import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: typeof userId === 'string',
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
  });
}
