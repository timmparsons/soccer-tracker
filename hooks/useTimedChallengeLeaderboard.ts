import { supabase } from '@/lib/supabase';
import { getAnonymousName } from '@/utils/anonymousName';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface TimedEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  touches: number;
  rank: number;
}

export const TIMED_OPTIONS = [
  { label: '30s', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
];

export function useTimedChallengeLeaderboard(durationSeconds: number) {
  const today = new Date();
  const weekStartObj = new Date(today);
  weekStartObj.setDate(today.getDate() - today.getDay());
  const weekStart = getLocalDate(weekStartObj);
  const todayStr = getLocalDate();

  return useQuery<TimedEntry[]>({
    queryKey: ['timed-leaderboard', durationSeconds, weekStart],
    enabled: durationSeconds > 0,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data: sessions } = await supabase
        .from('daily_sessions')
        .select('user_id, touches_logged')
        .eq('is_timed_challenge', true)
        .eq('challenge_duration_seconds', durationSeconds)
        .gte('date', weekStart)
        .lte('date', todayStr)
        .order('touches_logged', { ascending: false })
        .limit(500);

      if (!sessions || sessions.length === 0) return [];

      // Best score per user this week
      const bestByUser: Record<string, number> = {};
      for (const s of sessions) {
        if (!bestByUser[s.user_id] || s.touches_logged > bestByUser[s.user_id]) {
          bestByUser[s.user_id] = s.touches_logged;
        }
      }

      const userIds = Object.keys(bestByUser);

      // Fetch avatars
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', userIds);

      const avatarMap: Record<string, string | null> = {};
      for (const p of profiles ?? []) {
        avatarMap[p.id] = p.avatar_url ?? null;
      }

      return Object.entries(bestByUser)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 100)
        .map(([userId, touches], i) => ({
          userId,
          name: getAnonymousName(userId),
          avatarUrl: avatarMap[userId] ?? null,
          touches,
          rank: i + 1,
        }));
    },
  });
}

export async function getTimedRank(
  userId: string,
  durationSeconds: number,
  touches: number,
): Promise<number> {
  const today = new Date();
  const weekStartObj = new Date(today);
  weekStartObj.setDate(today.getDate() - today.getDay());
  const weekStart = getLocalDate(weekStartObj);
  const todayStr = getLocalDate();

  const { count } = await supabase
    .from('daily_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('is_timed_challenge', true)
    .eq('challenge_duration_seconds', durationSeconds)
    .gte('date', weekStart)
    .lte('date', todayStr)
    .gt('touches_logged', touches)
    .neq('user_id', userId);

  return (count ?? 0) + 1;
}
