import { supabase } from '@/lib/supabase';
import { getTouchXp, getSessionDurationXp, getStreakBonus } from './xp';

type XpRow = { event_type: string; xp_amount: number; reference_id?: string };

export async function awardXp(userId: string, events: XpRow[]) {
  const rows = events
    .filter((e) => e.xp_amount > 0)
    .map((e) => ({ user_id: userId, ...e }));

  if (rows.length === 0) return;

  const { error } = await supabase.from('xp_events').upsert(rows, {
    onConflict: 'user_id,event_type,reference_id',
    ignoreDuplicates: true,
  });
  if (error) { console.error('XP award error:', error); return; }

  const totalXp = rows.reduce((sum, r) => sum + r.xp_amount, 0);

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('id', userId)
    .single();

  const newTotal = (profile?.total_xp ?? 0) + totalXp;

  await supabase
    .from('profiles')
    .update({ total_xp: newTotal })
    .eq('id', userId);

  checkAndAwardXpBadges(userId, newTotal).catch(() => {});
}

async function checkAndAwardXpBadges(userId: string, totalXp: number) {
  const milestones = [
    { id: 'xp_100', threshold: 100 },
    { id: 'xp_500', threshold: 500 },
    { id: 'xp_1000', threshold: 1_000 },
    { id: 'xp_5000', threshold: 5_000 },
    { id: 'xp_10000', threshold: 10_000 },
  ];

  const toAward = milestones.filter((m) => totalXp >= m.threshold);
  if (toAward.length === 0) return;

  await supabase.from('user_badges').upsert(
    toAward.map((m) => ({ user_id: userId, badge_id: m.id })),
    { onConflict: 'user_id,badge_id', ignoreDuplicates: true },
  );
}

export function awardSessionXp(
  userId: string,
  touches: number,
  durationMinutes: number | null,
  sessionDate: string,
  streakDays: number,
) {
  const events: XpRow[] = [
    { event_type: 'touches', xp_amount: getTouchXp(touches), reference_id: sessionDate },
    { event_type: 'session_duration', xp_amount: getSessionDurationXp(durationMinutes), reference_id: sessionDate },
  ];
  const streak = getStreakBonus(streakDays);
  if (streak) {
    events.push({ event_type: streak.type, xp_amount: streak.xp, reference_id: `${streak.type}_${sessionDate}` });
  }
  return awardXp(userId, events);
}

export function awardChallengeXp(userId: string, challengeId: string, isCoach: boolean) {
  return awardXp(userId, [{
    event_type: isCoach ? 'coach_challenge' : 'challenge_win',
    xp_amount: isCoach ? 75 : 25,
    reference_id: challengeId,
  }]);
}
