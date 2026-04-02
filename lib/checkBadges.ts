import { supabase } from '@/lib/supabase';

export interface BadgeCheckContext {
  totalSessions: number;
  totalTouches: number;
  currentStreak: number;
  jugglesThisSession: number | null;
  previousJugglePB: number;
  durationMinutes: number | null;
  sessionsThisWeek: number;
  teamId: string | null;
}

export async function checkAndAwardBadges(
  userId: string,
  context: BadgeCheckContext,
): Promise<string[]> {
  // Fetch already-earned badge IDs
  const { data: existing } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId);

  const earned = new Set((existing ?? []).map((r) => r.badge_id));

  const toAward: string[] = [];

  const candidate = (id: string, condition: boolean) => {
    if (condition && !earned.has(id)) toAward.push(id);
  };

  // Streak badges
  candidate('streak_3', context.currentStreak >= 3);
  candidate('streak_7', context.currentStreak >= 7);
  candidate('streak_30', context.currentStreak >= 30);
  candidate('streak_100', context.currentStreak >= 100);
  candidate('streak_365', context.currentStreak >= 365);

  // Volume badges
  candidate('volume_1k', context.totalTouches >= 1_000);
  candidate('volume_10k', context.totalTouches >= 10_000);
  candidate('volume_50k', context.totalTouches >= 50_000);
  candidate('volume_100k', context.totalTouches >= 100_000);
  candidate('volume_500k', context.totalTouches >= 500_000);
  candidate('volume_1m', context.totalTouches >= 1_000_000);

  // Session badges
  candidate('sessions_first', context.totalSessions >= 1);
  candidate('sessions_10', context.totalSessions >= 10);
  candidate('sessions_50', context.totalSessions >= 50);
  candidate('sessions_100', context.totalSessions >= 100);
  candidate('sessions_week5', context.sessionsThisWeek >= 5);

  // Performance badges
  candidate(
    'perf_pb',
    context.jugglesThisSession !== null &&
      context.jugglesThisSession > context.previousJugglePB,
  );
  candidate(
    'perf_30min',
    context.durationMinutes !== null && context.durationMinutes >= 30,
  );

  // Social badges
  candidate('social_team', context.teamId !== null);

  // Drills badges — only check if not already earned (avoids unnecessary queries)
  if (!earned.has('drills_beginner')) {
    const [{ data: beginnerDrills }, { data: completedSessions }] = await Promise.all([
      supabase.from('drills').select('id').eq('difficulty_level', 'beginner'),
      supabase
        .from('daily_sessions')
        .select('drill_id')
        .eq('user_id', userId)
        .not('drill_id', 'is', null),
    ]);

    const completedIds = new Set((completedSessions ?? []).map((s) => s.drill_id));
    const allBeginnerDone =
      (beginnerDrills ?? []).length > 0 &&
      (beginnerDrills ?? []).every((d) => completedIds.has(d.id));

    candidate('drills_beginner', allBeginnerDone);
  }

  if (toAward.length === 0) return [];

  const { error } = await supabase.from('user_badges').insert(
    toAward.map((badge_id) => ({ user_id: userId, badge_id })),
  );

  if (error) {
    console.error('Error awarding badges:', error);
    return [];
  }

  return toAward;
}

// Called from the leaderboard after data loads to record last week's winner.
// Idempotent — week_start is the PK so duplicate calls are safe.
// Awards social_no1 badge to the winner if they don't already have it.
export async function recordWeeklyWin(
  weekStart: string,
  winnerId: string,
  currentUserId: string,
): Promise<void> {
  // Record the winner (ignore if already recorded for this week)
  await supabase
    .from('leaderboard_wins')
    .upsert({ week_start: weekStart, user_id: winnerId }, { onConflict: 'week_start', ignoreDuplicates: true });

  // Award badge to the winner if they're the current user and don't have it yet
  if (winnerId === currentUserId) {
    await supabase
      .from('user_badges')
      .upsert({ user_id: currentUserId, badge_id: 'social_no1' }, { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
  }
}
