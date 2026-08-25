import { calculateStreak } from '@/lib/streak';
import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface TeamMemberStats {
  id: string;
  name: string;
  avatar_url: string | null;
  weekly_touches: number;
  today_touches: number;
  last_week_touches: number;
  alltime_best_week: number;
  daily_target: number;
  max_juggle_count: number;
  current_streak: number;
}

interface CandidateProfile {
  id: string;
  name: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

const GLOBAL_LEADERBOARD_LIMIT = 100;

function getWeekWindows() {
  const today = getLocalDate();
  const todayObj = new Date();

  const weekStartObj = new Date(todayObj);
  weekStartObj.setDate(todayObj.getDate() - todayObj.getDay());
  const weekStartDate = getLocalDate(weekStartObj);

  const lastWeekEndObj = new Date(weekStartObj);
  lastWeekEndObj.setDate(weekStartObj.getDate() - 1);
  const lastWeekStartObj = new Date(lastWeekEndObj);
  lastWeekStartObj.setDate(lastWeekEndObj.getDate() - 6);
  const lastWeekStart = getLocalDate(lastWeekStartObj);
  const lastWeekEnd = getLocalDate(lastWeekEndObj);

  return { today, weekStartDate, lastWeekStart, lastWeekEnd };
}

async function fetchRecentSessions(memberIds: string[], lastWeekStart: string, today: string) {
  const { data } = await supabase
    .from('daily_sessions')
    .select('user_id, touches_logged, date')
    .in('user_id', memberIds)
    .gte('date', lastWeekStart)
    .lte('date', today);
  return data || [];
}

// Split recent vs. all-time into two queries: recent (last 14 days) is always
// small, while all-time needs a high explicit limit — without it, PostgREST
// silently caps at 1000 rows, causing players with older history to show 0
// on the All Time tab.
async function buildMemberStats(
  members: CandidateProfile[],
  recentSessionsRaw: { user_id: string; touches_logged: number; date: string }[],
  windows: ReturnType<typeof getWeekWindows>,
): Promise<TeamMemberStats[]> {
  const { today, weekStartDate, lastWeekStart, lastWeekEnd } = windows;
  const memberIds = members.map((m) => m.id);

  const [{ data: allSessionsRaw }, { data: allTargetsRaw }] = await Promise.all([
    supabase
      .from('daily_sessions')
      .select('user_id, touches_logged, date, juggle_count')
      .in('user_id', memberIds)
      .order('date', { ascending: false })
      .limit(50000),
    supabase
      .from('user_targets')
      .select('user_id, daily_target_touches')
      .in('user_id', memberIds),
  ]);

  const targetByMember: Record<string, number> = {};
  for (const t of allTargetsRaw || []) {
    targetByMember[t.user_id] = t.daily_target_touches;
  }

  const recentByMember: Record<string, { touches_logged: number; date: string }[]> = {};
  for (const s of recentSessionsRaw) {
    if (!recentByMember[s.user_id]) recentByMember[s.user_id] = [];
    recentByMember[s.user_id].push(s);
  }

  const allByMember: Record<string, { touches_logged: number; date: string; juggle_count: number | null }[]> = {};
  for (const s of allSessionsRaw || []) {
    if (!allByMember[s.user_id]) allByMember[s.user_id] = [];
    allByMember[s.user_id].push(s);
  }

  const memberStats: TeamMemberStats[] = members.map((member) => {
    const recent = recentByMember[member.id] || [];
    const all = allByMember[member.id] || [];

    const today_touches = recent
      .filter((s) => s.date === today)
      .reduce((sum, s) => sum + s.touches_logged, 0);

    const weekly_touches = recent
      .filter((s) => s.date >= weekStartDate && s.date <= today)
      .reduce((sum, s) => sum + s.touches_logged, 0);

    const last_week_touches = recent
      .filter((s) => s.date >= lastWeekStart && s.date <= lastWeekEnd)
      .reduce((sum, s) => sum + s.touches_logged, 0);

    const weekTotals: Record<string, number> = {};
    for (const s of all) {
      const d = new Date(s.date + 'T00:00:00');
      d.setDate(d.getDate() - d.getDay());
      const wk = getLocalDate(d);
      weekTotals[wk] = (weekTotals[wk] || 0) + s.touches_logged;
    }
    const alltime_best_week = Object.values(weekTotals).reduce(
      (max, v) => (v > max ? v : max),
      0,
    );

    const max_juggle_count = all.reduce(
      (max, s) => (s.juggle_count && s.juggle_count > max ? s.juggle_count : max),
      0,
    );

    const activeDates = [...new Set(all.map((s) => s.date))];
    const current_streak = calculateStreak(activeDates).currentStreak;

    return {
      id: member.id,
      name: member.name || member.display_name || 'Unknown Player',
      avatar_url: member.avatar_url,
      today_touches,
      weekly_touches,
      last_week_touches,
      alltime_best_week,
      daily_target: targetByMember[member.id] || 1000,
      max_juggle_count,
      current_streak,
    };
  });

  return memberStats.sort(
    (a, b) =>
      b.weekly_touches - a.weekly_touches ||
      b.current_streak - a.current_streak ||
      b.max_juggle_count - a.max_juggle_count ||
      a.name.localeCompare(b.name),
  );
}

export async function fetchTouchesLeaderboard(teamId: string, seasonStartDate?: string | null): Promise<TeamMemberStats[]> {
  const windows = getWeekWindows();

  const { data: teamMembers, error: membersError } = await supabase
    .from('profiles')
    .select('id, name, display_name, avatar_url')
    .eq('team_id', teamId)
    .eq('is_coach', false)
    .eq('is_test_account', false);

  if (membersError) throw membersError;
  if (!teamMembers || teamMembers.length === 0) return [];

  const memberIds = teamMembers.map((m) => m.id);
  const recentSessionsRaw = await fetchRecentSessions(memberIds, windows.lastWeekStart, windows.today);

  return buildMemberStats(teamMembers, recentSessionsRaw, windows);
}

export async function fetchClubTouchesLeaderboard(clubId: string, seasonStartDate?: string | null): Promise<TeamMemberStats[]> {
  const windows = getWeekWindows();

  const { data: clubMembers, error: membersError } = await supabase
    .from('profiles')
    .select('id, name, display_name, avatar_url')
    .eq('club_id', clubId)
    .eq('is_coach', false)
    .eq('is_test_account', false);

  if (membersError) throw membersError;
  if (!clubMembers || clubMembers.length === 0) return [];

  const memberIds = clubMembers.map((m) => m.id);
  const recentSessionsRaw = await fetchRecentSessions(memberIds, windows.lastWeekStart, windows.today);

  return buildMemberStats(clubMembers, recentSessionsRaw, windows);
}

// Global has no team/club boundary, so the candidate pool is every eligible
// profile. To avoid pulling full session history for the whole user base,
// rank everyone by this week's touches first and only fetch all-time stats
// (streaks, all-time best week, juggle high score) for the top 100.
export async function fetchGlobalTouchesLeaderboard(seasonStartDate?: string | null): Promise<TeamMemberStats[]> {
  const windows = getWeekWindows();

  const { data: allProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, display_name, avatar_url')
    .eq('is_coach', false)
    .eq('is_test_account', false);

  if (profilesError) throw profilesError;
  if (!allProfiles || allProfiles.length === 0) return [];

  const allIds = allProfiles.map((p) => p.id);
  const recentSessionsRaw = await fetchRecentSessions(allIds, windows.lastWeekStart, windows.today);

  const weeklyTouchesByUser: Record<string, number> = {};
  for (const s of recentSessionsRaw) {
    if (s.date >= windows.weekStartDate && s.date <= windows.today) {
      weeklyTouchesByUser[s.user_id] = (weeklyTouchesByUser[s.user_id] || 0) + s.touches_logged;
    }
  }

  const topIds = new Set(
    Object.entries(weeklyTouchesByUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, GLOBAL_LEADERBOARD_LIMIT)
      .map(([id]) => id),
  );
  if (topIds.size === 0) return [];

  const topProfiles = allProfiles.filter((p) => topIds.has(p.id));
  const topRecentSessions = recentSessionsRaw.filter((s) => topIds.has(s.user_id));

  return buildMemberStats(topProfiles, topRecentSessions, windows);
}

export function useTouchesLeaderboard(teamId: string | null | undefined, seasonStartDate?: string | null) {
  return useQuery({
    queryKey: ['team-touches-leaderboard', teamId, seasonStartDate ?? null],
    queryFn: () => fetchTouchesLeaderboard(teamId!, seasonStartDate),
    enabled: !!teamId,
    refetchInterval: 60_000,
  });
}

export function useClubTouchesLeaderboard(
  clubId: string | null | undefined,
  seasonStartDate?: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ['club-touches-leaderboard', clubId, seasonStartDate ?? null],
    queryFn: () => fetchClubTouchesLeaderboard(clubId!, seasonStartDate),
    enabled: !!clubId && enabled,
    refetchInterval: 60_000,
  });
}

export function useGlobalTouchesLeaderboard(seasonStartDate?: string | null, enabled = true) {
  return useQuery({
    queryKey: ['global-touches-leaderboard', seasonStartDate ?? null],
    queryFn: () => fetchGlobalTouchesLeaderboard(seasonStartDate),
    enabled,
    refetchInterval: 60_000,
  });
}
