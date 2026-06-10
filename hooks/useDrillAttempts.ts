import { checkAndAwardDrillTiers } from '@/lib/checkDrillTiers';
import { createFeedEvent } from '@/lib/feedEvents';
import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface DrillAttempt {
  id: string;
  user_id: string;
  drill_id: string;
  touches_target: number;
  time_seconds: number;
  created_at: string;
}

export interface DrillPersonalBest {
  drill_id: string;
  touches_target: number;
  best_time: number;
  achieved_at: string;
}

export function useDrillAttempts(userId: string | undefined, drillId?: string) {
  return useQuery({
    queryKey: ['drill-attempts', userId, drillId ?? 'all'],
    enabled: !!userId,
    queryFn: async (): Promise<DrillAttempt[]> => {
      let query = supabase
        .from('drill_attempts')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (drillId) query = query.eq('drill_id', drillId);
      const { data, error } = await query;
      if (error) return [];
      return (data ?? []) as DrillAttempt[];
    },
  });
}

export function useDrillPersonalBests(userId: string | undefined) {
  return useQuery({
    queryKey: ['drill-personal-bests', userId],
    enabled: !!userId,
    queryFn: async (): Promise<DrillPersonalBest[]> => {
      const { data, error } = await supabase
        .from('drill_attempts')
        .select('drill_id, touches_target, time_seconds, created_at')
        .eq('user_id', userId!)
        .order('time_seconds', { ascending: true });

      if (error || !data) return [];

      const bestMap = new Map<string, DrillPersonalBest>();
      for (const row of data as DrillAttempt[]) {
        const key = `${row.drill_id}-${row.touches_target}`;
        if (!bestMap.has(key)) {
          bestMap.set(key, {
            drill_id: row.drill_id,
            touches_target: row.touches_target,
            best_time: row.time_seconds,
            achieved_at: row.created_at,
          });
        }
      }
      return Array.from(bestMap.values());
    },
  });
}

export function useSaveDrillAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      drillId,
      drillName,
      touchesTarget,
      timeSeconds,
      teamId,
    }: {
      userId: string;
      drillId: string;
      drillName: string;
      touchesTarget: number;
      timeSeconds: number;
      teamId?: string | null;
    }) => {
      // Check current personal best before inserting
      const { data: existing } = await supabase
        .from('drill_attempts')
        .select('time_seconds')
        .eq('user_id', userId)
        .eq('drill_id', drillId)
        .eq('touches_target', touchesTarget)
        .order('time_seconds', { ascending: true })
        .limit(1)
        .maybeSingle();

      const previousBest: number | null = (existing as { time_seconds: number } | null)?.time_seconds ?? null;
      const isPersonalBest = previousBest === null || timeSeconds < previousBest;

      // Save the drill attempt
      const { data: attempt, error } = await supabase
        .from('drill_attempts')
        .insert({ user_id: userId, drill_id: drillId, touches_target: touchesTarget, time_seconds: timeSeconds })
        .select()
        .single();

      if (error) throw error;

      // Also write to daily_sessions with drill_id to preserve challenge streak
      const today = getLocalDate();
      await supabase.from('daily_sessions').insert({
        user_id: userId,
        touches_logged: touchesTarget,
        drill_id: drillId,
        date: today,
        duration_minutes: Math.max(1, Math.round(timeSeconds / 60)),
      });

      // Check drill tier badges when a new PB is set
      if (isPersonalBest) {
        await checkAndAwardDrillTiers(userId, drillId, drillName, touchesTarget, timeSeconds, teamId);
      }

      // Create feed event if team member
      if (teamId) {
        if (isPersonalBest) {
          await createFeedEvent(teamId, userId, 'personal_best', {
            drill_id: drillId,
            drill_name: drillName,
            touches_target: touchesTarget,
            time_seconds: timeSeconds,
            previous_best: previousBest ?? undefined,
          });
        } else {
          // Only post one training_session event per drill per day to avoid spam
          const { data: todayEvents } = await supabase
            .from('feed_events')
            .select('id')
            .eq('actor_id', userId)
            .eq('team_id', teamId)
            .eq('event_type', 'training_session')
            .gte('created_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (!todayEvents?.length) {
            await createFeedEvent(teamId, userId, 'training_session', {
              drill_id: drillId,
              drill_name: drillName,
              touches_target: touchesTarget,
              time_seconds: timeSeconds,
            });
          }
        }
      }

      return { attempt: attempt as DrillAttempt, isPersonalBest, previousBest };
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['drill-attempts', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['drill-personal-bests', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['drill-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['feed-events'] });
      queryClient.invalidateQueries({ queryKey: ['touch-tracking', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['challenge-stats', vars.userId] });
    },
  });
}
