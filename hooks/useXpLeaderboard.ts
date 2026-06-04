import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface XpLeaderboardEntry {
  id: string;
  name: string;
  avatar_url: string | null;
  today_xp: number;
  weekly_xp: number;
  total_xp: number;
}

export function useXpLeaderboard(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['xp-leaderboard', teamId],
    queryFn: async () => {
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url, total_xp')
        .eq('team_id', teamId!)
        .eq('is_coach', false);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const memberIds = members.map((m) => m.id);

      const todayObj = new Date();
      const todayStr = getLocalDate(todayObj);

      const weekStartObj = new Date(todayObj);
      weekStartObj.setDate(todayObj.getDate() - todayObj.getDay());
      weekStartObj.setHours(0, 0, 0, 0);
      const weekStart = weekStartObj.toISOString();

      const todayStart = new Date(todayStr + 'T00:00:00').toISOString();

      const [{ data: weekEvents }, { data: todayEvents }] = await Promise.all([
        supabase
          .from('xp_events')
          .select('user_id, xp_amount')
          .in('user_id', memberIds)
          .gte('created_at', weekStart),
        supabase
          .from('xp_events')
          .select('user_id, xp_amount')
          .in('user_id', memberIds)
          .gte('created_at', todayStart),
      ]);

      const weeklyByMember: Record<string, number> = {};
      for (const e of weekEvents ?? []) {
        weeklyByMember[e.user_id] = (weeklyByMember[e.user_id] ?? 0) + e.xp_amount;
      }

      const todayByMember: Record<string, number> = {};
      for (const e of todayEvents ?? []) {
        todayByMember[e.user_id] = (todayByMember[e.user_id] ?? 0) + e.xp_amount;
      }

      return members
        .map((m) => ({
          id: m.id,
          name: m.display_name || m.name || 'Unknown Player',
          avatar_url: m.avatar_url,
          today_xp: todayByMember[m.id] ?? 0,
          weekly_xp: weeklyByMember[m.id] ?? 0,
          total_xp: m.total_xp ?? 0,
        }))
        .sort((a, b) => b.weekly_xp - a.weekly_xp);
    },
    enabled: !!teamId,
  });
}
