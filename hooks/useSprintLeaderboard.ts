import { supabase } from '@/lib/supabase';
import { getDisplayName } from '@/utils/getDisplayName';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface SprintLeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  // Race-mode days (multi-drill combos) rank by time; duration-mode days
  // (single-drill combos, same fixed window for everyone) rank by reps —
  // only one of the two is populated depending on isDurationMode.
  durationMs: number | null;
  reps: number | null;
  isDurationMode: boolean;
  isPR: boolean;
  isCrown: boolean;
  isEarlyBird: boolean;
}

export function useSprintLeaderboard(teamId: string | null | undefined) {
  const today = getLocalDate();

  return useQuery({
    queryKey: ['sprint-leaderboard', teamId, today],
    queryFn: async (): Promise<SprintLeaderboardEntry[]> => {
      if (!teamId) return [];

      const { data: sprintRow } = await (supabase as any)
        .from('daily_sprints')
        .select('id, combo_id')
        .eq('date', today)
        .maybeSingle();

      if (!sprintRow) return [];

      const { data: combo } = await (supabase as any)
        .from('sprint_combos')
        .select('drill_ids')
        .eq('id', sprintRow.combo_id)
        .maybeSingle();

      const isDurationMode = (combo?.drill_ids?.length ?? 0) === 1;
      const metricColumn = isDurationMode ? 'reps_completed' : 'duration_ms';

      const { data: roster } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', teamId)
        .eq('is_coach', false);

      if (!roster || roster.length === 0) return [];
      const rosterIds = new Set(roster.map((r) => r.id));
      const profileMap = new Map(roster.map((r) => [r.id, r]));

      const { data: attempts } = await (supabase as any)
        .from('sprint_attempts')
        .select('profile_id, duration_ms, reps_completed, is_pr, is_crown, created_at')
        .eq('daily_sprint_id', sprintRow.id)
        .order(metricColumn, { ascending: !isDurationMode });

      if (!attempts || attempts.length === 0) return [];

      // Attempts are sorted by the day's ranking metric, so the first
      // attempt seen per profile is that player's best result for today.
      // Skip rows missing the metric for today's mode — e.g. a race-mode
      // attempt with no reps_completed would otherwise sort first on a
      // duration-mode day (Postgres default is NULLS FIRST for DESC).
      const bestByProfile = new Map<
        string,
        { duration_ms: number; reps_completed: number | null; is_pr: boolean; is_crown: boolean; created_at: string }
      >();
      for (const a of attempts as {
        profile_id: string;
        duration_ms: number;
        reps_completed: number | null;
        is_pr: boolean;
        is_crown: boolean;
        created_at: string;
      }[]) {
        if (!rosterIds.has(a.profile_id)) continue;
        if (a[metricColumn as 'duration_ms' | 'reps_completed'] == null) continue;
        if (!bestByProfile.has(a.profile_id)) bestByProfile.set(a.profile_id, a);
      }

      const earliestEntry = [...bestByProfile.entries()].sort(
        (a, b) => new Date(a[1].created_at).getTime() - new Date(b[1].created_at).getTime(),
      )[0];
      const earlyBirdProfileId = earliestEntry?.[0];

      const entries: SprintLeaderboardEntry[] = [...bestByProfile.entries()].map(([profileId, a]) => {
        const profile = profileMap.get(profileId);
        return {
          userId: profileId,
          name: getDisplayName(profile),
          avatarUrl: profile?.avatar_url ?? null,
          durationMs: isDurationMode ? null : a.duration_ms,
          reps: isDurationMode ? a.reps_completed : null,
          isDurationMode,
          isPR: a.is_pr,
          isCrown: a.is_crown,
          isEarlyBird: profileId === earlyBirdProfileId,
        };
      });

      return entries.sort((a, b) =>
        isDurationMode ? (b.reps ?? 0) - (a.reps ?? 0) : (a.durationMs ?? 0) - (b.durationMs ?? 0),
      );
    },
    enabled: !!teamId,
    refetchInterval: 60_000,
  });
}
