// hooks/useSessions.ts
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export type Session = {
  id: string;
  user_id: string;
  score: number;
  duration: number;
  attempts: number;
  created_at: string;
};

export function useSessions(userId: string | undefined) {
  return useQuery<Session[]>({
    queryKey: ['sessions', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data as Session[];
    },
  });
}
