import { checkAndAwardSquadBadge } from '@/lib/checkSquadBadges';
import { supabase } from '@/lib/supabase';
import { TOUCHES_PER_REP } from '@/hooks/useDailyChallenge';
import { CHALLENGE_DURATIONS } from '@/hooks/useTouchTracking';
import { useTodayDate } from '@/hooks/useTodayDate';
import { getDisplayName } from '@/utils/getDisplayName';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export interface SprintComboDrill {
  name: string;
  videoUrl?: string;
}

export interface DailySprintData {
  dailySprintId: string;
  comboId: string;
  comboName: string;
  comboSteps: string[];
  comboDrills: SprintComboDrill[];
  comboDrillIds: string[];
  comboReps: number;
  comboTouches: number;
  crownThresholdMs: number;
  personalBestMs: number | null;
  todayBestMs: number | null;
  teamPaceMs: number | null;
  rosterSize: number;
  completedCount: number;
  teamLeaderName: string | null;
  teamLeaderMs: number | null;
  rank: number | null;
  // Single-drill combos run duration-mode: do the drill for a fixed window,
  // then log your rep count, rather than racing 5 reps against the clock.
  isDurationMode: boolean;
  durationSeconds: number | null;
  touchesPerRep: number;
  personalBestReps: number | null;
  todayBestReps: number | null;
  teamAvgReps: number | null;
  teamLeaderReps: number | null;
}

interface SprintCombo {
  id: string;
  name: string;
  drill_ids: string[];
  reps: number;
  crown_threshold_ms: number;
}

// Same date-seeded rotation approach as getFallbackForDate in useDailyChallenge.ts.
function pickComboForDate(dateStr: string, combos: SprintCombo[]): SprintCombo {
  const [y, m, d] = dateStr.split('-').map(Number);
  const seed = y * 10000 + m * 100 + d;
  return combos[seed % combos.length];
}

// Duration-mode combos (single drill) pull from the same duration pool as
// the Daily Challenge circuit, seeded off the date + combo so it doesn't
// collide with pickComboForDate's own rotation.
function pickDurationForDate(dateStr: string, comboId: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const seed = y * 10000 + m * 100 + d;
  let comboSeed = 0;
  for (let i = 0; i < comboId.length; i++) comboSeed += comboId.charCodeAt(i);
  return CHALLENGE_DURATIONS[(seed + comboSeed) % CHALLENGE_DURATIONS.length];
}

export function useDailySprint(userId: string | undefined, teamId: string | null | undefined) {
  const today = useTodayDate();
  const queryClient = useQueryClient();

  const queryKey = ['daily-sprint', userId, teamId ?? null, today];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<DailySprintData | null> => {
      if (!userId) throw new Error('No user ID');

      let { data: sprintRow } = await (supabase as any)
        .from('daily_sprints')
        .select('id, combo_id')
        .eq('date', today)
        .maybeSingle();

      if (!sprintRow) {
        const { data: combos } = await (supabase as any)
          .from('sprint_combos')
          .select('id, name, drill_ids, reps, crown_threshold_ms')
          .order('created_at', { ascending: true });

        if (!combos || combos.length === 0) return null;

        const picked = pickComboForDate(today, combos);
        await (supabase as any)
          .from('daily_sprints')
          .upsert({ date: today, combo_id: picked.id }, { onConflict: 'date', ignoreDuplicates: true });

        const { data: inserted } = await (supabase as any)
          .from('daily_sprints')
          .select('id, combo_id')
          .eq('date', today)
          .maybeSingle();

        sprintRow = inserted;
      }

      if (!sprintRow) return null;

      const { data: combo } = await (supabase as any)
        .from('sprint_combos')
        .select('id, name, drill_ids, reps, crown_threshold_ms')
        .eq('id', sprintRow.combo_id)
        .maybeSingle();

      if (!combo) return null;

      const { data: drills } = await supabase
        .from('drills')
        .select('id, name, video_url')
        .in('id', combo.drill_ids);

      const drillMap = new Map(
        (drills || []).map((dr: { id: string; name: string; video_url: string | null }) => [
          dr.id,
          { name: dr.name, videoUrl: dr.video_url ?? undefined },
        ]),
      );
      const comboSteps: string[] = combo.drill_ids.map((id: string) => drillMap.get(id)?.name ?? 'Unknown');
      const comboDrills: SprintComboDrill[] = combo.drill_ids.map((id: string) => ({
        name: drillMap.get(id)?.name ?? 'Unknown',
        videoUrl: drillMap.get(id)?.videoUrl,
      }));

      const isDurationMode = combo.drill_ids.length === 1;
      const durationSeconds = isDurationMode ? pickDurationForDate(today, combo.id) : null;
      const touchesPerRep = TOUCHES_PER_REP[combo.drill_ids[0]] ?? 2;

      const metricColumn = isDurationMode ? 'reps_completed' : 'duration_ms';

      const [{ data: personalAttempts }, { data: todayAttempts }] = await Promise.all([
        (supabase as any)
          .from('sprint_attempts')
          .select(metricColumn)
          .eq('profile_id', userId)
          .eq('combo_id', combo.id)
          .order(metricColumn, { ascending: !isDurationMode })
          .limit(1),
        (supabase as any)
          .from('sprint_attempts')
          .select(`profile_id, ${metricColumn}`)
          .eq('daily_sprint_id', sprintRow.id),
      ]);

      const personalBestMetric =
        personalAttempts && personalAttempts.length > 0 ? personalAttempts[0][metricColumn] : null;
      const personalBestMs = isDurationMode ? null : personalBestMetric;
      const personalBestReps = isDurationMode ? personalBestMetric : null;

      // "best" means fastest (lowest ms) in race mode, most reps in duration mode.
      const isBetter = (a: number, b: number) => (isDurationMode ? a > b : a < b);

      const bestByProfile = new Map<string, number>();
      for (const attempt of todayAttempts || []) {
        const value = attempt[metricColumn];
        if (value == null) continue;
        const current = bestByProfile.get(attempt.profile_id);
        if (current == null || isBetter(value, current)) {
          bestByProfile.set(attempt.profile_id, value);
        }
      }
      const todayBestMetric = bestByProfile.get(userId) ?? null;
      const todayBestMs = isDurationMode ? null : todayBestMetric;
      const todayBestReps = isDurationMode ? todayBestMetric : null;

      let rosterSize = 0;
      let completedCount = bestByProfile.size;
      let teamPaceMs: number | null = null;
      let teamAvgReps: number | null = null;
      let teamLeaderName: string | null = null;
      let teamLeaderMs: number | null = null;
      let teamLeaderReps: number | null = null;
      let rank: number | null = null;

      if (teamId) {
        const { data: roster } = await supabase
          .from('profiles')
          .select('id, name, display_name, avatar_url')
          .eq('team_id', teamId)
          .eq('is_coach', false);

        rosterSize = roster?.length ?? 0;
        const rosterIds = new Set((roster || []).map((r) => r.id));
        const profileMap = new Map((roster || []).map((r) => [r.id, r]));
        const teamEntries = [...bestByProfile.entries()].filter(([profileId]) => rosterIds.has(profileId));
        completedCount = teamEntries.length;
        const teamValues = teamEntries.map(([, value]) => value);
        const teamAvg = teamValues.length > 0
          ? Math.round(teamValues.reduce((sum, value) => sum + value, 0) / teamValues.length)
          : null;
        teamPaceMs = isDurationMode ? null : teamAvg;
        teamAvgReps = isDurationMode ? teamAvg : null;

        const sortedTeam = [...teamEntries].sort((a, b) => (isDurationMode ? b[1] - a[1] : a[1] - b[1]));
        if (sortedTeam.length > 0) {
          const [leaderId, leaderValue] = sortedTeam[0];
          teamLeaderName = getDisplayName(profileMap.get(leaderId));
          teamLeaderMs = isDurationMode ? null : leaderValue;
          teamLeaderReps = isDurationMode ? leaderValue : null;
        }
        if (todayBestMetric != null) {
          rank = sortedTeam.filter(([, value]) => isBetter(value, todayBestMetric)).length + 1;
        }

        checkAndAwardSquadBadge(
          teamId,
          today,
          teamEntries.map(([profileId]) => profileId),
          rosterSize,
        ).catch((err) => console.error('Error checking squad badge:', err));
      }

      const comboTouches = combo.drill_ids.reduce(
        (sum: number, drillId: string) => sum + (TOUCHES_PER_REP[drillId] ?? 2),
        0,
      ) * combo.reps;

      return {
        dailySprintId: sprintRow.id,
        comboId: combo.id,
        comboName: combo.name,
        comboSteps,
        comboDrills,
        isDurationMode,
        durationSeconds,
        touchesPerRep,
        personalBestReps,
        todayBestReps,
        teamAvgReps,
        teamLeaderReps,
        comboDrillIds: combo.drill_ids,
        comboReps: combo.reps,
        comboTouches,
        crownThresholdMs: combo.crown_threshold_ms,
        personalBestMs,
        todayBestMs,
        teamPaceMs,
        rosterSize,
        completedCount,
        teamLeaderName,
        teamLeaderMs,
        rank,
      };
    },
    enabled: !!userId,
  });

  const invalidateAfterAttempt = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
    queryClient.invalidateQueries({ queryKey: ['touch-tracking', userId] });
    queryClient.invalidateQueries({ queryKey: ['active-streak', userId] });
    queryClient.invalidateQueries({ queryKey: ['recent-sessions', userId] });
    queryClient.invalidateQueries({ queryKey: ['daily-touch-history', userId] });
    queryClient.invalidateQueries({ queryKey: ['heatmap-stats', userId] });
  }, [queryClient, queryKey, userId]);

  const submitAttempt = useCallback(
    async (durationMs: number, isPR: boolean, isCrown: boolean) => {
      if (!userId || !data) return;

      const { error } = await (supabase as any).from('sprint_attempts').insert({
        daily_sprint_id: data.dailySprintId,
        combo_id: data.comboId,
        profile_id: userId,
        duration_ms: durationMs,
        is_pr: isPR,
        is_crown: isCrown,
      });
      if (error) throw error;

      // Every attempt is a full run-through of the combo (reps included), so
      // it counts as touches the same way the Daily Challenge circuit does —
      // sprint_attempts alone never fed daily_sessions, which is why
      // completed sprints weren't showing up in Weekly Touches/streaks.
      const { error: sessionError } = await supabase.from('daily_sessions').insert({
        user_id: userId,
        touches_logged: data.comboTouches,
        duration_minutes: Math.max(1, Math.round(durationMs / 1000 / 60)),
        date: getLocalDate(),
      });
      if (sessionError) throw sessionError;

      invalidateAfterAttempt();
    },
    [userId, data, invalidateAfterAttempt],
  );

  // Duration-mode combos (single drill) have no time to race, so the "attempt"
  // is a self-reported rep count logged after the fixed window runs out.
  const submitReps = useCallback(
    async (repsCompleted: number, isPR: boolean) => {
      if (!userId || !data || data.durationSeconds == null) return;

      const { error } = await (supabase as any).from('sprint_attempts').insert({
        daily_sprint_id: data.dailySprintId,
        combo_id: data.comboId,
        profile_id: userId,
        duration_ms: data.durationSeconds * 1000,
        reps_completed: repsCompleted,
        is_pr: isPR,
        is_crown: false,
      });
      if (error) throw error;

      const { error: sessionError } = await supabase.from('daily_sessions').insert({
        user_id: userId,
        touches_logged: repsCompleted * data.touchesPerRep,
        duration_minutes: Math.max(1, Math.round(data.durationSeconds / 60)),
        date: getLocalDate(),
      });
      if (sessionError) throw sessionError;

      invalidateAfterAttempt();
    },
    [userId, data, invalidateAfterAttempt],
  );

  return { sprint: data ?? null, isLoading, submitAttempt, submitReps };
}

// Count of sprint_attempts flagged is_pr for this profile within the
// current calendar month — powers the "Challenge PRs" stat on Progress.
export function useMonthlyPRCount(userId: string | undefined) {
  const today = useTodayDate();

  return useQuery({
    queryKey: ['monthly-pr-count', userId, today],
    queryFn: async (): Promise<number> => {
      if (!userId) throw new Error('No user ID');

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const { count } = await (supabase as any)
        .from('sprint_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', userId)
        .eq('is_pr', true)
        .gte('created_at', monthStart.toISOString());

      return count || 0;
    },
    enabled: !!userId,
  });
}
