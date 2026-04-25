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
}

export async function fetchTouchesLeaderboard(teamId: string, seasonStartDate?: string | null): Promise<TeamMemberStats[]> {
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

  const { data: teamMembers, error: membersError } = await supabase
    .from('profiles')
    .select('id, name, display_name, avatar_url')
    .eq('team_id', teamId)
    .eq('is_coach', false);

  if (membersError) throw membersError;
  if (!teamMembers || teamMembers.length === 0) return [];

  const memberIds = teamMembers.map((m) => m.id);

  // Split into two queries:
  // 1. Recent sessions (last 14 days) for today/week/last_week — always small
  // 2. All sessions with a high explicit limit for alltime_best_week.
  //    Without an explicit limit, PostgREST silently caps at 1000 rows, which
  //    causes players with older history to show 0 on the All Time tab.
  const [
    { data: recentSessionsRaw },
    { data: allSessionsRaw },
    { data: allTargetsRaw },
  ] = await Promise.all([
    supabase
      .from('daily_sessions')
      .select('user_id, touches_logged, date')
      .in('user_id', memberIds)
      .gte('date', lastWeekStart)
      .lte('date', today),
    supabase
      .from('daily_sessions')
      .select('user_id, touches_logged, date')
      .in('user_id', memberIds)
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
  for (const s of recentSessionsRaw || []) {
    if (!recentByMember[s.user_id]) recentByMember[s.user_id] = [];
    recentByMember[s.user_id].push(s);
  }

  const allByMember: Record<string, { touches_logged: number; date: string }[]> = {};
  for (const s of allSessionsRaw || []) {
    if (!allByMember[s.user_id]) allByMember[s.user_id] = [];
    allByMember[s.user_id].push(s);
  }

  const memberStats: TeamMemberStats[] = teamMembers.map((member) => {
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

    return {
      id: member.id,
      name: member.name || member.display_name || 'Unknown Player',
      avatar_url: member.avatar_url,
      today_touches,
      weekly_touches,
      last_week_touches,
      alltime_best_week,
      daily_target: targetByMember[member.id] || 1000,
    };
  });

  return memberStats.sort((a, b) => b.weekly_touches - a.weekly_touches);
}

export function useTouchesLeaderboard(teamId: string | null | undefined, seasonStartDate?: string | null) {
  return useQuery({
    queryKey: ['team-touches-leaderboard', teamId, seasonStartDate ?? null],
    queryFn: () => fetchTouchesLeaderboard(teamId!, seasonStartDate),
    enabled: !!teamId,
  });
}
