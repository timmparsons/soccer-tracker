import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type UpdateProfileInput = {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  location?: string | null;
  bio?: string | null;
  role?: 'player' | 'coach';
  team_id?: string | null;
  avatar_url?: string | null;
};

export function useUpdateProfile(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: UpdateProfileInput) => {
      if (!userId) {
        throw new Error('Missing userId');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
    },

    // ✅ SAFE OPTIMISTIC UPDATE (profile only)
    onMutate: async (updates) => {
      if (!userId) return;

      await queryClient.cancelQueries({ queryKey: ['profile', userId] });

      const previousProfile = queryClient.getQueryData(['profile', userId]);

      queryClient.setQueryData(['profile', userId], (old: any) => ({
        ...(old ?? {}), // 🔥 NEW-USER SAFE
        ...updates,
      }));

      return { previousProfile };
    },

    // 🔁 Roll back on error
    onError: (_err, _updates, context: any) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(['profile', userId], context.previousProfile);
      }
    },

    // 🔄 Always refetch real data
    onSettled: () => {
      if (!userId) return;

      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['team', userId] });
      queryClient.invalidateQueries({ queryKey: ['team-leaderboard'] });
    },
  });
}
