import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import {
  getTouchXp,
  getSessionDurationXp,
  getStreakBonus,
  getAdditionalTrainingXp,
  ADDITIONAL_TRAINING_DAILY_CAP,
  TOUCH_XP_DAILY_CAP,
} from './xp';

type XpRow = { event_type: string; xp_amount: number; reference_id?: string };

export async function awardXp(userId: string, events: XpRow[]) {
  const candidates = events
    .filter((e) => e.xp_amount > 0)
    .map((e) => ({ user_id: userId, ...e }));

  if (candidates.length === 0) return;

  // Pre-check which reference_ids already have events so we don't double-count
  const withRef = candidates.filter((r) => r.reference_id);
  const alreadyAwarded = new Set<string>();

  if (withRef.length > 0) {
    const { data: existing } = await supabase
      .from('xp_events')
      .select('event_type, reference_id')
      .eq('user_id', userId)
      .in('reference_id', withRef.map((r) => r.reference_id!));

    for (const e of existing ?? []) {
      alreadyAwarded.add(`${e.event_type}:${e.reference_id}`);
    }
  }

  const newRows = candidates.filter(
    (r) => !r.reference_id || !alreadyAwarded.has(`${r.event_type}:${r.reference_id}`),
  );

  if (newRows.length === 0) return;

  const { error } = await supabase.from('xp_events').insert(newRows);
  if (error) { console.error('XP award error:', error); return; }

  const totalXp = newRows.reduce((sum, r) => sum + r.xp_amount, 0);

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
    { event_type: 'touches', xp_amount: Math.min(getTouchXp(touches), TOUCH_XP_DAILY_CAP), reference_id: sessionDate },
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

export async function awardAdditionalTrainingXp(
  userId: string,
  category: string,
  durationMinutes: 5 | 10 | 15,
): Promise<{ xpAwarded: number }> {
  const today = getLocalDate();
  const todayStart = new Date(today + 'T00:00:00').toISOString();

  const { data: todayEvents } = await supabase
    .from('xp_events')
    .select('xp_amount')
    .eq('user_id', userId)
    .eq('event_type', 'additional_training')
    .gte('created_at', todayStart);

  const todayTotal = (todayEvents ?? []).reduce((sum, r) => sum + r.xp_amount, 0);
  const remaining = Math.max(0, ADDITIONAL_TRAINING_DAILY_CAP - todayTotal);
  const rawXp = getAdditionalTrainingXp(category, durationMinutes);
  const xpToAward = Math.min(rawXp, remaining);

  const { data: session } = await supabase
    .from('additional_training_sessions')
    .insert({ user_id: userId, category, duration_minutes: durationMinutes, xp_awarded: xpToAward })
    .select('id')
    .single();

  if (xpToAward > 0 && session?.id) {
    await awardXp(userId, [{
      event_type: 'additional_training',
      xp_amount: xpToAward,
      reference_id: session.id,
    }]);
  }

  return { xpAwarded: xpToAward };
}
