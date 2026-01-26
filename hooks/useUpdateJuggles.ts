// hooks/useUpdateJuggles.ts
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
  all_attempts?: number[];
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

      // 4️⃣ Calculate XP to award - NEW 10:1 RATIO
      let totalXpAwarded = 0;
      let totalJuggles = 0;

      // If all_attempts array is provided, award XP for total juggles
      if (updates.all_attempts && updates.all_attempts.length > 0) {
        totalJuggles = updates.all_attempts.reduce(
          (sum, count) => sum + count,
          0
        );

        // 10 juggles = 1 XP
        totalXpAwarded = Math.floor(totalJuggles / 10);

        // Personal Best Bonus: +50 XP if new high score
        const isPB =
          updates.high_score !== undefined &&
          updates.high_score > (existing?.high_score ?? 0);
        if (isPB) {
          totalXpAwarded += 50;
        }
      } else {
        // OLD LOGIC: Single attempt (for backwards compatibility)
        totalJuggles = updates.last_score ?? 0;
        const baseXp = Math.floor(totalJuggles / 10);
        const isPB =
          updates.high_score !== undefined &&
          updates.high_score > (existing?.high_score ?? 0);
        const pbBonus = isPB ? 50 : 0;
        totalXpAwarded = baseXp + pbBonus;
      }

      // 5️⃣ Use add_xp RPC function to ensure trigger fires properly
      if (totalXpAwarded > 0) {
        const { error: xpError } = await supabase.rpc('add_xp', {
          user_id: userId,
          xp_to_add: totalXpAwarded,
        });

        if (xpError) {
          console.error('Error awarding XP:', xpError);
          throw xpError;
        }
      }

      return { ...result, totalXpAwarded, totalJuggles };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['juggles', userId] });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['team-players'] });
      queryClient.invalidateQueries({ queryKey: ['team-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['team-level'] });
      queryClient.invalidateQueries({
        queryKey: ['team-player-contributions'],
      });
    },
  });
}
