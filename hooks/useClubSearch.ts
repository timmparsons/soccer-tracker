import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface ClubResult {
  id: string;
  name: string;
}

export function useClubSearch(query: string) {
  return useQuery({
    queryKey: ['club-search', query],
    enabled: query.trim().length >= 2,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<ClubResult[]> => {
      const { data } = await supabase
        .from('clubs')
        .select('id, name')
        .ilike('name', `%${query.trim()}%`)
        .limit(10);
      return data ?? [];
    },
  });
}
