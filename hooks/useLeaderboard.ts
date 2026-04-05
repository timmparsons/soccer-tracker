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

  // Convert seasonStartDate to a date string (YYYY-MM-DD) for comparison
  const seasonStart = seasonStartDate
    ? getLocalDate(new Date(seasonStartDate))
    : null;

  let sessionsQuery = supabase
    .from('daily_sessions')
    .select('user_id, touches_logged, date')
    .in('user_id', memberIds);

  if (seasonStart) {
    sessionsQuery = sessionsQuery.gte('date', seasonStart);
  }

  const [{ data: allSessionsRaw }, { data: allTargetsRaw }] = await Promise.all([
    sessionsQuery,
    supabase
      .from('user_targets')
      .select('user_id, daily_target_touches')
      .in('user_id', memberIds),
  ]);

  const targetByMember: Record<string, number> = {};
  for (const t of allTargetsRaw || []) {
    targetByMember[t.user_id] = t.daily_target_touches;
  }

  const sessionsByMember: Record<string, { touches_logged: number; date: string }[]> = {};
  for (const s of allSessionsRaw || []) {
    if (!sessionsByMember[s.user_id]) sessionsByMember[s.user_id] = [];
    sessionsByMember[s.user_id].push(s);
  }

  const memberStats: TeamMemberStats[] = teamMembers.map((member) => {
    const sessions = sessionsByMember[member.id] || [];

    const today_touches = sessions
      .filter((s) => s.date === today)
      .reduce((sum, s) => sum + s.touches_logged, 0);

    const weekly_touches = sessions
      .filter((s) => s.date >= weekStartDate && s.date <= today)
      .reduce((sum, s) => sum + s.touches_logged, 0);

    const last_week_touches = sessions
      .filter((s) => s.date >= lastWeekStart && s.date <= lastWeekEnd)
      .reduce((sum, s) => sum + s.touches_logged, 0);

    const weekTotals: Record<string, number> = {};
    for (const s of sessions) {
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
