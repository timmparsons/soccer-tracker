import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateProfile(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: any) => {
      if (!userId) throw new Error('No user ID');

      let team_id = undefined;

      // If user entered a team code → look it up
      if (updates.team_code) {
        const { data: team, error: teamErr } = await supabase
          .from('teams')
          .select('id')
          .eq('code', updates.team_code)
          .single();

        if (teamErr || !team) {
          throw new Error('Invalid team code');
        }

        team_id = team.id;
      }

      // Build update object
      const updateData: any = {
        ...(updates.name && { name: updates.name }),
        ...(updates.username && { username: updates.username }),
        ...(updates.location && { location: updates.location }),
        ...(updates.bio && { bio: updates.bio }),
        ...(updates.avatar_url && { avatar_url: updates.avatar_url }),
        ...(team_id && { team_id }),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      return updateData;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
