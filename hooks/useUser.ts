import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
    staleTime: Infinity, // User data rarely changes during a session
  });
}
