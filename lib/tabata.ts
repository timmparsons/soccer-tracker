import { DRILL_IDS, TOUCHES_PER_REP } from '@/hooks/useDailyChallenge';
import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { getTodayTouchTotal, MAX_DAILY_TOUCHES } from '@/lib/touchLimits';

export const TABATA_TOUCHES_PER_REP = TOUCHES_PER_REP[DRILL_IDS.TOE_TAPS];

export interface TabataSessionInput {
  roundsCompleted: number;
  totalReps: number;
}

export interface TabataSessionResult {
  touchesCredited: number;
  dailySessionId: string;
}

export async function logTabataSession(
  userId: string,
  { roundsCompleted, totalReps }: TabataSessionInput,
): Promise<TabataSessionResult> {
  const today = getLocalDate();
  const rawTouches = totalReps * TABATA_TOUCHES_PER_REP;
  const todayTotal = await getTodayTouchTotal(userId, today);
  const touchesCredited = Math.max(
    0,
    Math.min(rawTouches, MAX_DAILY_TOUCHES - todayTotal),
  );

  const { data: session, error: sessionError } = await supabase
    .from('daily_sessions')
    .insert({
      user_id: userId,
      touches_logged: touchesCredited,
      duration_minutes: 4,
      date: today,
      challenge_type: 'tabata',
    })
    .select('id')
    .single();
  if (sessionError) throw sessionError;

  const { error: resultError } = await (supabase as any)
    .from('tabata_results')
    .insert({
      user_id: userId,
      date: today,
      rounds_completed: roundsCompleted,
      total_reps: totalReps,
      touches_credited: touchesCredited,
      daily_session_id: session.id,
    });
  if (resultError) throw resultError;

  return { touchesCredited, dailySessionId: session.id };
}
