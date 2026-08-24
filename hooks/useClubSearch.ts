import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface ClubResult {
  id: string;
  name: string;
  logo_url: string | null;
}

// With no query, returns a short list of clubs to browse for ideas rather than
// leaving the search box empty. Once the user types 2+ chars, it filters by name.
export function useClubSearch(query: string) {
  const trimmed = query.trim();
  const browsing = trimmed.length === 0;

  return useQuery({
    queryKey: ['club-search', trimmed],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<ClubResult[]> => {
      let request = supabase.from('clubs').select('id, name, logo_url');
      request = browsing
        ? request.order('created_at', { ascending: false }).limit(8)
        : request.ilike('name', `%${trimmed}%`).limit(10);
      const { data } = await request;
      return data ?? [];
    },
  });
}
