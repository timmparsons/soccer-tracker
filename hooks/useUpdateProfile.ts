// hooks/useUpdateProfile.ts
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: any) => {
      const { user_id } = updates;
      if (!user_id) throw new Error('Missing user_id in update call');

      let team_id: string | undefined;

      // TEAM CODE → look up team
      if (updates.team_code) {
        const { data: team, error: teamErr } = await supabase
          .from('teams')
          .select('id')
          .eq('code', updates.team_code)
          .maybeSingle();

        if (teamErr || !team) throw new Error('Invalid team code');
        team_id = team.id;
      }

      // Build update object mapped to database fields
      const updateData: any = {
        ...(updates.first_name !== undefined && {
          first_name: updates.first_name,
        }),
        ...(updates.last_name !== undefined && {
          last_name: updates.last_name,
        }),
        ...(updates.display_name !== undefined && {
          display_name: updates.display_name,
        }),
        ...(updates.role !== undefined && { role: updates.role }),
        ...(updates.avatar_url && { avatar_url: updates.avatar_url }),
        ...(team_id && { team_id }),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user_id);

      if (error) throw error;

      return updateData;
    },

    onSuccess: () => {
      // invalidate everything that depends on profile/status/team
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['teamLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['juggles'] });
    },
  });
}
