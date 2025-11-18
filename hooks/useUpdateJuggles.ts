import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type JuggleUpdates = {
  high_score?: number;
  last_score?: number;
  last_session_duration: number;
  attempts_count?: number;
  sessions_count?: number;
  average_score?: number;
};

export function useJuggleSession(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: JuggleUpdates) => {
      if (!userId) throw new Error('No user ID provided');

      // 1️⃣ Try to get the row for this user
      const { data: existing, error: selectError } = await supabase
        .from('juggles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (selectError) throw selectError;

      // 2️⃣ If no row exists → create one
      if (!existing) {
        const { data: inserted, error: insertError } = await supabase
          .from('juggles')
          .insert({
            user_id: userId,
            ...updates,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return inserted;
      }

      // 3️⃣ If row exists → update it
      const { data: updated, error: updateError } = await supabase
        .from('juggles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      return updated;
    },

    // 4️⃣ After success → refresh cached juggles for this user
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['juggles', userId] });
    },
  });
}
