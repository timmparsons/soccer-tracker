import { supabase } from '@/lib/supabase';
import { getAnonymousName } from '@/utils/anonymousName';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface GlobalPlayer {
  userId: string;
  name: string;
  avatarUrl: string | null;
  touches: number;
}

export function useGlobalLeaderboard() {
  const todayObj = new Date();
  const weekStartObj = new Date(todayObj);
  weekStartObj.setDate(todayObj.getDate() - todayObj.getDay());
  const weekStart = getLocalDate(weekStartObj);
  const today = getLocalDate();

  return useQuery({
    queryKey: ['global-leaderboard', weekStart],
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<GlobalPlayer[]> => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .eq('is_coach', false)
        .eq('onboarding_completed', true);

      if (!profiles || profiles.length === 0) return [];

      const profileIds = profiles.map((p) => p.id);
      const avatarMap: Record<string, string | null> = {};
      for (const p of profiles) avatarMap[p.id] = p.avatar_url ?? null;

      const { data: sessions } = await supabase
        .from('daily_sessions')
        .select('user_id, touches_logged')
        .in('user_id', profileIds)
        .gte('date', weekStart)
        .lte('date', today)
        .limit(10000);

      const totals: Record<string, number> = {};
      for (const s of sessions ?? []) {
        totals[s.user_id] = (totals[s.user_id] ?? 0) + s.touches_logged;
      }

      return Object.entries(totals)
        .filter(([, touches]) => touches > 0)
        .map(([userId, touches]) => ({
          userId,
          name: getAnonymousName(userId),
          avatarUrl: avatarMap[userId] ?? null,
          touches,
        }))
        .sort((a, b) => b.touches - a.touches)
        .slice(0, 100);
    },
  });
}
