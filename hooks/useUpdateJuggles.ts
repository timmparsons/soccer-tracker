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
      console.log('🚨 Juggle updates payload', updates);

      // 1️⃣ Get existing row
      const { data: existing, error: selectError } = await supabase
        .from('juggles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (selectError) throw selectError;

      // Build new scores_history entry if needed
      let newHistory = existing?.scores_history ?? [];

      if (updates.last_score !== undefined && !isNaN(updates.last_score)) {
        newHistory = [
          ...newHistory,
          {
            score: updates.last_score,
            date: new Date().toISOString(),
          },
        ];
        newHistory = newHistory.slice(-30);
      }

      let result;

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
        result = inserted;
      } else {
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
        result = updated;
      }

      // 4️⃣ Calculate XP to award
      // Base XP: 1 juggle = 1 XP
      const baseXp = updates.last_score ?? 0;

      // Personal Best Bonus: +50 XP
      const isPB =
        updates.high_score !== undefined &&
        updates.high_score > (existing?.high_score ?? 0);
      const pbBonus = isPB ? 50 : 0;

      const totalXpAwarded = baseXp + pbBonus;

      // 5️⃣ Update profile XP in ONE database call
      if (totalXpAwarded > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_xp')
          .eq('id', userId)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              total_xp: (profile.total_xp || 0) + totalXpAwarded,
            })
            .eq('id', userId);
        }
      }

      return { ...result, totalXpAwarded };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['juggles', userId] });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['team-players'] }); // Refresh coach dashboard
      queryClient.invalidateQueries({ queryKey: ['team-leaderboard'] }); // Refresh leaderboard
    },
  });
}
