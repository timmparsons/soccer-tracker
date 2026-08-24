import { supabase } from '@/lib/supabase';

export const MAX_SESSION_TOUCHES = 9999;
export const MAX_SESSION_JUGGLES = 9999;
export const MAX_DAILY_TOUCHES = 15000;

export async function getTodayTouchTotal(userId: string, date: string): Promise<number> {
  const { data } = await supabase
    .from('daily_sessions')
    .select('touches_logged')
    .eq('user_id', userId)
    .eq('date', date);
  return (data ?? []).reduce((sum: number, s: { touches_logged: number }) => sum + s.touches_logged, 0);
}
