import { supabase } from '@/lib/supabase';
import { getLevelFromXp } from '@/lib/xp';
import { AUTO_CHECKED_BADGE_IDS, getTeamBadge, TeamBadgeDefinition } from '@/lib/teamBadges';

export interface TeamBadgeResult extends TeamBadgeDefinition {}

export interface TeamBadgeProgress {
  badgeId: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  qualifiedCount: number;
  required: number;
  playersNeeded: number;
}

function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

function getNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Try streak starting from today
  let streak = 0;
  let cursor = new Date(today);
  for (const dateStr of unique) {
    const d = new Date(dateStr + 'T00:00:00');
    if (d.getTime() === cursor.getTime()) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (d.getTime() < cursor.getTime()) {
      break;
    }
  }
  if (streak > 0) return streak;

  // Try streak starting from yesterday (player hasn't trained today yet)
  cursor = new Date(today);
  cursor.setDate(cursor.getDate() - 1);
  for (const dateStr of unique) {
    const d = new Date(dateStr + 'T00:00:00');
    if (d.getTime() === cursor.getTime()) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (d.getTime() < cursor.getTime()) {
      break;
    }
  }
  return streak;
}

export async function checkTeamBadges(teamId: string): Promise<TeamBadgeResult[]> {
  // 1. Fetch all non-coach players on the team
  const { data: players, error: playersError } = await supabase
    .from('profiles')
    .select('id, total_xp')
    .eq('team_id', teamId)
    .eq('is_coach', false);

  if (playersError || !players || players.length === 0) return [];

  const playerIds = players.map((p) => p.id);
  const playerCount = playerIds.length;
  if (playerCount === 0) return [];

  const weekStart = getWeekStart();

  // 2. Fetch already-earned team badges to avoid duplicates
  const { data: earned } = await supabase
    .from('team_badges')
    .select('badge_type, week_start')
    .eq('team_id', teamId);

  const earnedSet = new Set(
    (earned ?? []).map((r) =>
      r.week_start ? `${r.badge_type}:${r.week_start}` : r.badge_type,
    ),
  );

  const isEarned = (id: string, repeatable: boolean) =>
    repeatable ? earnedSet.has(`${id}:${weekStart}`) : earnedSet.has(id);

  // 3. Fetch current week sessions for all players
  const { data: weekSessions } = await supabase
    .from('daily_sessions')
    .select('user_id, date, touches_logged')
    .in('user_id', playerIds)
    .gte('date', weekStart);

  // Aggregate week stats per player
  const weekTouches: Record<string, number> = {};
  const weekDays: Record<string, Set<string>> = {};
  const weekendDays: Record<string, Set<string>> = {};

  for (const s of weekSessions ?? []) {
    weekTouches[s.user_id] = (weekTouches[s.user_id] ?? 0) + s.touches_logged;
    if (!weekDays[s.user_id]) weekDays[s.user_id] = new Set();
    weekDays[s.user_id].add(s.date);

    const dow = new Date(s.date + 'T00:00:00').getDay();
    if (dow === 0 || dow === 6) {
      if (!weekendDays[s.user_id]) weekendDays[s.user_id] = new Set();
      weekendDays[s.user_id].add(String(dow));
    }
  }

  // Days in the current week so far (Sun = 0 … today)
  const daysInWeekSoFar = new Date().getDay() + 1;

  const toAward: { badge_type: string; week_start: string | null }[] = [];

  const candidate = (id: string, repeatable: boolean, condition: boolean) => {
    if (condition && !isEarned(id, repeatable)) {
      toAward.push({ badge_type: id, week_start: repeatable ? weekStart : null });
    }
  };

  const threshold80 = Math.ceil(playerCount * 0.8);

  // WEEKLY BADGES
  const trainedThisWeek = playerIds.filter((id) => (weekDays[id]?.size ?? 0) > 0).length;
  candidate('team_squad_active', true, trainedThisWeek >= threshold80);
  candidate('team_all_in', true, trainedThisWeek >= playerCount);

  const hit5k = playerIds.filter((id) => (weekTouches[id] ?? 0) >= 5000).length;
  candidate('team_5k_week', true, hit5k >= threshold80);

  const hit10k = playerIds.filter((id) => (weekTouches[id] ?? 0) >= 10000).length;
  candidate('team_10k_week', true, hit10k >= threshold80);

  const trainedEveryDay = playerIds.filter(
    (id) => (weekDays[id]?.size ?? 0) >= daysInWeekSoFar,
  ).length;
  candidate('team_perfect_week', true, trainedEveryDay >= threshold80);

  const trainedWeekend = playerIds.filter(
    (id) => (weekendDays[id]?.size ?? 0) >= 2,
  ).length;
  candidate('team_weekend_warriors', true, trainedWeekend >= threshold80);

  // ONE-TIME MILESTONE BADGES — only fetch extra data if badges not already earned
  const needsStreakCheck =
    !isEarned('team_streak_squad', false) || !isEarned('team_hot_squad', false);
  const needsMilestoneCheck =
    !isEarned('team_century_club', false) ||
    !isEarned('team_50k_club', false) ||
    !isEarned('team_100k_club', false) ||
    !isEarned('team_elite_squad', false) ||
    !isEarned('team_1m_touches', false);

  if (needsStreakCheck) {
    const { data: recentSessions } = await supabase
      .from('daily_sessions')
      .select('user_id, date')
      .in('user_id', playerIds)
      .gte('date', getNDaysAgo(30))
      .order('date', { ascending: false });

    const datesByPlayer: Record<string, string[]> = {};
    for (const s of recentSessions ?? []) {
      if (!datesByPlayer[s.user_id]) datesByPlayer[s.user_id] = [];
      datesByPlayer[s.user_id].push(s.date);
    }

    const streaks = playerIds.map((id) => computeStreak(datesByPlayer[id] ?? []));
    const streak3Count = streaks.filter((s) => s >= 3).length;
    const streak7Count = streaks.filter((s) => s >= 7).length;

    candidate('team_streak_squad', false, streak3Count >= threshold80);
    candidate('team_hot_squad', false, streak7Count >= threshold80);
  }

  if (needsMilestoneCheck) {
    const { data: allSessions } = await supabase
      .from('daily_sessions')
      .select('user_id, touches_logged')
      .in('user_id', playerIds);

    const totalTouches: Record<string, number> = {};
    const totalSessions: Record<string, number> = {};
    let combinedTouches = 0;

    for (const s of allSessions ?? []) {
      totalTouches[s.user_id] = (totalTouches[s.user_id] ?? 0) + s.touches_logged;
      totalSessions[s.user_id] = (totalSessions[s.user_id] ?? 0) + 1;
      combinedTouches += s.touches_logged;
    }

    const sessions100 = playerIds.filter((id) => (totalSessions[id] ?? 0) >= 100).length;
    candidate('team_century_club', false, sessions100 >= threshold80);

    const touches50k = playerIds.filter((id) => (totalTouches[id] ?? 0) >= 50000).length;
    candidate('team_50k_club', false, touches50k >= threshold80);

    const touches100k = playerIds.filter((id) => (totalTouches[id] ?? 0) >= 100000).length;
    candidate('team_100k_club', false, touches100k >= threshold80);

    const level10 = players.filter((p) => getLevelFromXp(p.total_xp).level >= 10).length;
    candidate('team_elite_squad', false, level10 >= threshold80);

    candidate('team_1m_touches', false, combinedTouches >= 1_000_000);
  }

  if (toAward.length === 0) return [];

  const { error } = await supabase.from('team_badges').insert(
    toAward.map((b) => ({ team_id: teamId, ...b })),
  );

  if (error) {
    // Ignore unique-constraint violations (race conditions between players logging simultaneously)
    if (!error.message?.includes('duplicate') && !error.message?.includes('unique')) {
      console.error('Error awarding team badges:', error);
    }
    return [];
  }

  return toAward
    .map((b) => getTeamBadge(b.badge_type))
    .filter((b): b is TeamBadgeDefinition => b !== undefined);
}

// Returns progress toward the closest upcoming badge (for the progress strip)
export async function getTeamBadgeProgress(teamId: string): Promise<TeamBadgeProgress | null> {
  const { data: players } = await supabase
    .from('profiles')
    .select('id, total_xp')
    .eq('team_id', teamId)
    .eq('is_coach', false);

  if (!players || players.length === 0) return null;

  const playerIds = players.map((p) => p.id);
  const playerCount = playerIds.length;
  const weekStart = getWeekStart();

  const { data: earned } = await supabase
    .from('team_badges')
    .select('badge_type, week_start')
    .eq('team_id', teamId);

  const earnedSet = new Set(
    (earned ?? []).map((r) =>
      r.week_start ? `${r.badge_type}:${r.week_start}` : r.badge_type,
    ),
  );

  const { data: weekSessions } = await supabase
    .from('daily_sessions')
    .select('user_id, date, touches_logged')
    .in('user_id', playerIds)
    .gte('date', weekStart);

  const weekTouches: Record<string, number> = {};
  const weekDays: Record<string, Set<string>> = {};

  for (const s of weekSessions ?? []) {
    weekTouches[s.user_id] = (weekTouches[s.user_id] ?? 0) + s.touches_logged;
    if (!weekDays[s.user_id]) weekDays[s.user_id] = new Set();
    weekDays[s.user_id].add(s.date);
  }

  const threshold80 = Math.ceil(playerCount * 0.8);

  const candidates: { id: string; qualifiedCount: number; required: number }[] = [
    {
      id: 'team_squad_active',
      qualifiedCount: playerIds.filter((id) => (weekDays[id]?.size ?? 0) > 0).length,
      required: threshold80,
    },
    {
      id: 'team_5k_week',
      qualifiedCount: playerIds.filter((id) => (weekTouches[id] ?? 0) >= 5000).length,
      required: threshold80,
    },
    {
      id: 'team_all_in',
      qualifiedCount: playerIds.filter((id) => (weekDays[id]?.size ?? 0) > 0).length,
      required: playerCount,
    },
  ];

  // Find the candidate that is closest to completion but not yet earned
  let best: TeamBadgeProgress | null = null;
  let bestRatio = -1;

  for (const c of candidates) {
    const key = `${c.id}:${weekStart}`;
    if (earnedSet.has(key)) continue;

    const ratio = c.qualifiedCount / c.required;
    if (ratio >= 1) continue; // already earned (will be caught by checkTeamBadges)
    if (ratio > bestRatio) {
      bestRatio = ratio;
      const def = getTeamBadge(c.id)!;
      best = {
        badgeId: c.id,
        name: def.name,
        icon: def.icon,
        color: def.color,
        description: def.description,
        qualifiedCount: c.qualifiedCount,
        required: c.required,
        playersNeeded: c.required - c.qualifiedCount,
      };
    }
  }

  return best;
}
