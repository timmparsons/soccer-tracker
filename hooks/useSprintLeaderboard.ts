import { supabase } from '@/lib/supabase';
import { getDisplayName } from '@/utils/getDisplayName';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface SprintLeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  durationMs: number;
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
        .select('id')
        .eq('date', today)
        .maybeSingle();

      if (!sprintRow) return [];

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
        .select('profile_id, duration_ms, is_pr, is_crown, created_at')
        .eq('daily_sprint_id', sprintRow.id)
        .order('duration_ms', { ascending: true });

      if (!attempts || attempts.length === 0) return [];

      // Attempts are sorted by duration ascending, so the first attempt seen
      // per profile is that player's best time for today.
      const bestByProfile = new Map<string, { duration_ms: number; is_pr: boolean; is_crown: boolean; created_at: string }>();
      for (const a of attempts as { profile_id: string; duration_ms: number; is_pr: boolean; is_crown: boolean; created_at: string }[]) {
        if (!rosterIds.has(a.profile_id)) continue;
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
          durationMs: a.duration_ms,
          isPR: a.is_pr,
          isCrown: a.is_crown,
          isEarlyBird: profileId === earlyBirdProfileId,
        };
      });

      return entries.sort((a, b) => a.durationMs - b.durationMs);
    },
    enabled: !!teamId,
    refetchInterval: 60_000,
  });
}
