import { awardXp } from '@/lib/awardXp';
import { supabase } from '@/lib/supabase';
import { getXpForEvent, type XpEventType } from '@/lib/xp';
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
  challenge_xp?: number; // NEW: Optional challenge XP to award
};

export function useUpdateJuggles(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: JuggleUpdates) => {
      if (!userId) throw new Error('No user ID provided');
      console.log('🚨 Juggle updates payload', updates);

      // Extract challenge_xp before sending to database
      const { challenge_xp, ...dbUpdates } = updates;

      // 1️⃣ Get existing row
      const { data: existing, error: selectError } = await supabase
        .from('juggles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (selectError) throw selectError;

      // Build new scores_history entry if needed
      let newHistory = existing?.scores_history ?? [];

      if (dbUpdates.last_score !== undefined && !isNaN(dbUpdates.last_score)) {
        newHistory = [
          ...newHistory,
          {
            score: dbUpdates.last_score,
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
            ...dbUpdates,
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
            ...dbUpdates,
            scores_history: newHistory,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (updateError) throw updateError;
        result = updated;
      }

      // 🟦🟦🟦 4️⃣ Determine XP events  ---------------------------------------------------
      const xpEvents: XpEventType[] = ['SESSION_COMPLETED'];

      const lastScore = dbUpdates.last_score ?? null;
      const previousHighScore = existing?.high_score ?? 0;

      // Detect Personal Best
      const isPB = lastScore !== null && lastScore > previousHighScore;
      if (isPB) xpEvents.push('NEW_PERSONAL_BEST');

      // Detect daily target hit (change condition later)
      const hitDailyTarget = lastScore !== null && lastScore >= 50;
      if (hitDailyTarget) xpEvents.push('DAILY_TARGET_HIT');

      // 5️⃣ Award XP for all triggered events
      await Promise.all(xpEvents.map((event) => awardXp(userId, event)));

      // 🎯 NEW: Award challenge XP if provided
      if (challenge_xp && challenge_xp > 0) {
        // Get current profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_xp')
          .eq('id', userId)
          .single();

        if (profile) {
          // Award the challenge XP directly
          await supabase
            .from('profiles')
            .update({
              total_xp: (profile.total_xp || 0) + challenge_xp,
            })
            .eq('id', userId);
        }
      }
      // 🟦🟦🟦 -------------------------------------------------------------------------

      const baseXpAwarded = xpEvents.reduce(
        (sum, event) => sum + getXpForEvent(event),
        0
      );

      const totalXpAwarded = baseXpAwarded + (challenge_xp || 0);

      return { ...result, totalXpAwarded };
    },

    // 6️⃣ Auto-refetch after saving XP + juggles
    onSuccess: (_, __, context) => {
      queryClient.invalidateQueries({ queryKey: ['juggles', userId] });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}
