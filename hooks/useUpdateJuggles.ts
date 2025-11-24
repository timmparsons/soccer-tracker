import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type JuggleUpdates = {
  high_score?: number;
  last_score?: number;
  last_session_duration: number;
  attempts_count?: number;
  sessions_count?: number;
  average_score?: number;
  last_session_date?: string;
  streak_days?: number;
  best_daily_streak?: number;
};

export function useUpdateJuggles(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: JuggleUpdates) => {
      if (!userId) throw new Error('No user ID provided');

      // 1️⃣ Get existing row
      const { data: existing, error: selectError } = await supabase
        .from('juggles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (selectError) throw selectError;

      // Build new scores_history entry if a score was provided
      let newHistory = existing?.scores_history ?? [];

      if (updates.last_score !== undefined && !isNaN(updates.last_score)) {
        newHistory = [
          ...newHistory,
          {
            score: updates.last_score,
            date: new Date().toISOString(),
          },
        ];

        // Optional: keep last 30 entries for performance
        newHistory = newHistory.slice(-30);
      }

      // 2️⃣ If row doesn't exist → insert new
      if (!existing) {
        const { data: inserted, error: insertError } = await supabase
          .from('juggles')
          .insert({
            user_id: userId,
            ...updates,
            scores_history: newHistory,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return inserted;
      }

      // 3️⃣ Update existing row
      const { data: updated, error: updateError } = await supabase
        .from('juggles')
        .update({
          ...updates,
          scores_history: newHistory,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      return updated;
    },

    // 4️⃣ Auto-refetch after saving
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['juggles', userId] });
    },
  });
}
