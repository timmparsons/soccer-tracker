import { supabase } from '@/lib/supabase';
import { getCurrentWeekChallenge, WeeklyChallenge } from '@/lib/teamBadges';
import { getLocalDate } from '@/utils/getLocalDate';

export interface PlayerProgress {
  id: string;
  name: string;
  value: number;       // raw metric value (touches, days, sessions, streak, 0/1)
  qualified: boolean;
}

export interface WeeklyChallengeStatus {
  challenge: WeeklyChallenge;
  weekStart: string;
  playerCount: number;
  qualifiedCount: number;
  required: number;
  playersNeeded: number;
  achieved: boolean;
  alreadyAwarded: boolean;
  players: PlayerProgress[];
}

function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return getLocalDate(d);
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

  for (const startOffset of [0, 1]) {
    let streak = 0;
    const cursor = new Date(today);
    cursor.setDate(cursor.getDate() - startOffset);
    for (const d of unique) {
      const date = new Date(d + 'T00:00:00');
      if (date.getTime() === cursor.getTime()) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (date.getTime() < cursor.getTime()) {
        break;
      }
    }
    if (streak > 0) return streak;
  }
  return 0;
}

export async function getWeeklyChallengeStatus(teamId: string): Promise<WeeklyChallengeStatus | null> {
  const weekStart = getWeekStart();
  const challenge = getCurrentWeekChallenge();

  const [{ data: players }, { data: earnedRow }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, name')
      .eq('team_id', teamId)
      .eq('is_coach', false),
    supabase
      .from('team_badges')
      .select('id')
      .eq('team_id', teamId)
      .eq('badge_type', challenge.id)
      .eq('week_start', weekStart)
      .maybeSingle(),
  ]);

  if (!players || players.length === 0) return null;

  const playerIds = players.map((p) => p.id);
  const playerCount = players.length;

  // Fetch week sessions (always needed)
  const { data: weekSessions } = await supabase
    .from('daily_sessions')
    .select('user_id, touches_logged, date, juggle_count')
    .in('user_id', playerIds)
    .gte('date', weekStart);

  // Aggregate week stats per player
  const weekTouches: Record<string, number> = {};
  const weekDays: Record<string, Set<string>> = {};
  const weekSessionCount: Record<string, number> = {};
  const hasJuggled: Record<string, boolean> = {};

  for (const s of weekSessions ?? []) {
    weekTouches[s.user_id] = (weekTouches[s.user_id] ?? 0) + s.touches_logged;
    weekSessionCount[s.user_id] = (weekSessionCount[s.user_id] ?? 0) + 1;
    if (!weekDays[s.user_id]) weekDays[s.user_id] = new Set();
    weekDays[s.user_id].add(s.date);
    if (s.juggle_count && s.juggle_count > 0) hasJuggled[s.user_id] = true;
  }

  // Fetch streak data only when needed
  let streakByPlayer: Record<string, number> = {};
  if (challenge.metric === 'streak_days') {
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
    for (const id of playerIds) {
      streakByPlayer[id] = computeStreak(datesByPlayer[id] ?? []);
    }
  }

  // Compute per-player metric value and qualification
  const playerProgress: PlayerProgress[] = players.map((p) => {
    let value = 0;
    let qualified = false;

    switch (challenge.metric) {
      case 'week_touches':
        value = weekTouches[p.id] ?? 0;
        qualified = value >= challenge.target;
        break;
      case 'training_days':
        value = weekDays[p.id]?.size ?? 0;
        qualified = value >= challenge.target;
        break;
      case 'week_sessions':
        value = weekSessionCount[p.id] ?? 0;
        qualified = value >= challenge.target;
        break;
      case 'streak_days':
        value = streakByPlayer[p.id] ?? 0;
        qualified = value >= challenge.target;
        break;
      case 'has_juggled':
        value = hasJuggled[p.id] ? 1 : 0;
        qualified = hasJuggled[p.id] ?? false;
        break;
      case 'all_in_plus_touches':
        // Must train at least once AND (separately) 80% must hit touchTarget
        value = weekTouches[p.id] ?? 0;
        qualified = (weekDays[p.id]?.size ?? 0) >= 1; // trained this week
        break;
    }

    return {
      id: p.id,
      name: p.display_name || p.name || 'Player',
      value,
      qualified,
    };
  });

  // For all_in_plus_touches: qualification is compound
  // - 100% must have trained (playerProgress.qualified means "trained")
  // - 80% must hit touchTarget
  let qualifiedCount: number;
  let required: number;

  if (challenge.metric === 'all_in_plus_touches') {
    const touchTarget = challenge.touchTarget ?? 3_000;
    const allTrained = playerProgress.every((p) => p.qualified);
    const touchQualified = playerProgress.filter((p) => p.value >= touchTarget).length;
    const touchRequired = Math.ceil(playerCount * challenge.thresholdPct);

    // Both conditions must hold
    qualifiedCount = allTrained ? touchQualified : 0;
    required = touchRequired;

    // Update player qualified flag to reflect touch target (for display)
    for (const p of playerProgress) {
      p.qualified = p.qualified && p.value >= touchTarget;
    }
  } else {
    required = challenge.thresholdPct === 1.0
      ? playerCount
      : Math.ceil(playerCount * challenge.thresholdPct);
    qualifiedCount = playerProgress.filter((p) => p.qualified).length;
  }

  const achieved = qualifiedCount >= required;

  return {
    challenge,
    weekStart,
    playerCount,
    qualifiedCount,
    required,
    playersNeeded: Math.max(0, required - qualifiedCount),
    achieved,
    alreadyAwarded: !!earnedRow,
    players: playerProgress.sort((a, b) => b.value - a.value),
  };
}

export async function checkAndAwardWeeklyChallenge(teamId: string): Promise<boolean> {
  const status = await getWeeklyChallengeStatus(teamId);
  if (!status || !status.achieved || status.alreadyAwarded) return false;

  const { error } = await supabase.from('team_badges').insert({
    team_id: teamId,
    badge_type: status.challenge.id,
    week_start: status.weekStart,
  });

  if (error) {
    if (!error.message?.includes('duplicate') && !error.message?.includes('unique')) {
      console.error('Error awarding weekly team badge:', error);
    }
    return false;
  }

  return true;
}
