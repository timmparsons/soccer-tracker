import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface InactivePlayer {
  id: string;
  name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  last_session_date: string | null;
}

export function useInactivePlayers(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['inactive-players', teamId],
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<InactivePlayer[]> => {
      const { data: players } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', teamId!)
        .eq('is_coach', false);

      if (!players || players.length === 0) return [];

      const playerIds = players.map((p) => p.id);

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 3);
      const cutoffStr = getLocalDate(cutoff);

      const { data: recentSessions } = await supabase
        .from('daily_sessions')
        .select('user_id, date')
        .in('user_id', playerIds)
        .gte('date', cutoffStr);

      const activeIds = new Set((recentSessions ?? []).map((s) => s.user_id));

      // Get the last session date for each inactive player
      const inactiveIds = playerIds.filter((id) => !activeIds.has(id));
      if (inactiveIds.length === 0) return [];

      const { data: lastSessions } = await supabase
        .from('daily_sessions')
        .select('user_id, date')
        .in('user_id', inactiveIds)
        .order('date', { ascending: false });

      const lastSessionByPlayer: Record<string, string> = {};
      for (const s of lastSessions ?? []) {
        if (!lastSessionByPlayer[s.user_id]) {
          lastSessionByPlayer[s.user_id] = s.date;
        }
      }

      return players
        .filter((p) => !activeIds.has(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          last_session_date: lastSessionByPlayer[p.id] ?? null,
        }));
    },
  });
}
