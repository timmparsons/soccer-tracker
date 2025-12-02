import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export type Profile = {
  id: string;
  name: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  username: string | null;
  location: string | null;
  team_id: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, first_name, last_name, display_name, avatar_url, role, team_id, team_code'
        )
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}
