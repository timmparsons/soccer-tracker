import { supabase } from '@/lib/supabase';
import { awardXp } from '@/lib/awardXp';
import { getLocalDate } from '@/utils/getLocalDate';
import { getLevelFromXp, getMissionDifficulty, getMissionXp, type MissionDifficulty } from '@/lib/xp';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface ChallengeDrill {
  id: string; // challenge_drills.id
  drill_id: string;
  drill_name: string;
  drill_description: string | null;
  drill_video_url: string | null;
  target_reps: number | null;
  touch_value: number;
  sort_order: number;
}

export interface DailyChallengeTemplate {
  id: string;
  name: string;
  description: string;
  xp_reward: number;
  day_of_week: number;
  category: string | null;
  difficulty: MissionDifficulty | null;
}

export function useDailyChallenge(userId: string | undefined, totalXp = 0) {
  const queryClient = useQueryClient();
  const today = getLocalDate();
  const dayOfWeek = new Date().getDay();

  const { level } = getLevelFromXp(totalXp);
  const playerDifficulty = getMissionDifficulty(level);

  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['daily-challenge-template', dayOfWeek, playerDifficulty],
    queryFn: async () => {
      // Try to fetch a template matching the player's difficulty
      const { data } = await supabase
        .from('daily_challenge_templates')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .eq('difficulty', playerDifficulty)
        .maybeSingle();

      if (data) return data as DailyChallengeTemplate;

      // Fallback: any template for today (pre-difficulty schema)
      const { data: fallback } = await supabase
        .from('daily_challenge_templates')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .maybeSingle();

      return fallback as DailyChallengeTemplate | null;
    },
    staleTime: 1000 * 60 * 60,
  });

  const { data: drills = [], isLoading: drillsLoading } = useQuery({
    queryKey: ['challenge-drills', template?.id],
    queryFn: async () => {
      if (!template?.id) return [];
      const { data } = await supabase
        .from('challenge_drills')
        .select('id, drill_id, target_reps, touch_value, sort_order, drills(name, description, video_url)')
        .eq('template_id', template.id)
        .order('sort_order');

      if (!data) return [];
      return data.map((row): ChallengeDrill => {
        const drill = Array.isArray(row.drills) ? row.drills[0] : row.drills;
        return {
          id: row.id,
          drill_id: row.drill_id,
          drill_name: drill?.name ?? 'Drill',
          drill_description: drill?.description ?? null,
          drill_video_url: drill?.video_url ?? null,
          target_reps: row.target_reps,
          touch_value: row.touch_value ?? row.target_reps ?? 0,
          sort_order: row.sort_order,
        };
      });
    },
    enabled: !!template?.id,
    staleTime: 1000 * 60 * 60,
  });

  const { data: completion, isLoading: completionLoading } = useQuery({
    queryKey: ['daily-challenge-completion', userId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_challenge_completions')
        .select('id')
        .eq('user_id', userId!)
        .eq('completed_date', today)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const { data: completedDrillIds = [] } = useQuery({
    queryKey: ['challenge-drill-completions', userId, today],
    queryFn: async () => {
      const drillIds = drills.map((d) => d.id);
      if (!drillIds.length) return [];
      const { data } = await supabase
        .from('daily_challenge_drill_completions')
        .select('challenge_drill_id')
        .eq('user_id', userId!)
        .eq('completed_date', today)
        .in('challenge_drill_id', drillIds);
      return (data ?? []).map((r: { challenge_drill_id: string }) => r.challenge_drill_id);
    },
    enabled: !!userId && drills.length > 0,
  });

  const completeDrillMutation = useMutation({
    mutationFn: async (challengeDrillId: string) => {
      if (!userId) throw new Error('No user');
      const { error } = await supabase
        .from('daily_challenge_drill_completions')
        .upsert(
          { user_id: userId, challenge_drill_id: challengeDrillId, completed_date: today },
          { onConflict: 'user_id,challenge_drill_id,completed_date', ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenge-drill-completions', userId, today] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !template) throw new Error('Missing data');

      const xpAmount = template.difficulty
        ? getMissionXp(template.difficulty)
        : template.xp_reward;

      const { error } = await supabase
        .from('daily_challenge_completions')
        .insert({
          user_id: userId,
          template_id: template.id,
          completed_date: today,
          difficulty: template.difficulty ?? 'intermediate',
          xp_awarded: xpAmount,
        });
      if (error) throw error;

      // Log touches from the mission drills to daily_sessions (uses touch_value for accuracy)
      const totalTouches = drills.reduce((sum, d) => sum + d.touch_value, 0);
      if (totalTouches > 0) {
        await supabase.from('daily_sessions').insert({
          user_id: userId,
          touches_logged: totalTouches,
          date: today,
          duration_minutes: null,
        });
      }

      await awardXp(userId, [{
        event_type: 'daily_challenge',
        xp_amount: xpAmount,
        reference_id: `daily_challenge_${today}`,
      }]);

      return { xp: xpAmount, touches: totalTouches };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-challenge-completion', userId, today] });
      queryClient.invalidateQueries({ queryKey: ['user-xp-stats', userId] });
      queryClient.invalidateQueries({ queryKey: ['xp-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['touch-tracking', userId] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });

  const totalMissionTouches = drills.reduce((sum, d) => sum + d.touch_value, 0);

  return {
    template,
    drills,
    totalMissionTouches,
    isCompleted: !!completion,
    completedDrillIds,
    allDrillsDone: drills.length === 0 || drills.every((d) => completedDrillIds.includes(d.id)),
    isLoading: templateLoading || completionLoading,
    drillsLoading,
    completeDrill: completeDrillMutation.mutateAsync,
    complete: completeMutation.mutateAsync,
    completing: completeMutation.isPending,
    playerDifficulty,
  };
}
