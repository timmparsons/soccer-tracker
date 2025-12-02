import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateProfile(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: any) => {
      if (!userId) {
        throw new Error('No userId provided to useUpdateProfile');
      }

      let team_id;

      // -------- TEAM CODE LOOKUP --------
      if (updates.team_code) {
        const { data: team, error: teamErr } = await supabase
          .from('teams')
          .select('id')
          .eq('code', updates.team_code)
          .maybeSingle();

        if (teamErr || !team) {
          throw new Error('Invalid team code');
        }

        team_id = team.id;
      }

      // -------- BUILD CLEAN UPDATE OBJECT --------
      const updateData: any = {
        ...(updates.first_name && { first_name: updates.first_name }),
        ...(updates.last_name && { last_name: updates.last_name }),
        ...(updates.display_name && { display_name: updates.display_name }),
        ...(updates.location !== undefined && { location: updates.location }),
        ...(updates.bio !== undefined && { bio: updates.bio }),
        ...(updates.role && { role: updates.role }),
        ...(team_id && { team_id }),
      };

      console.log('[useUpdateProfile] Running update:', updateData);

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('[useUpdateProfile] SQL error:', error);
        throw error;
      }

      return updateData;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['teamLeaderboard'] });
    },
  });
}
