import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export type DaySessionMap = Record<string, Record<string, { touches: number }>>;

function getIsoWeekDates(): { weekStart: string; weekEnd: string; weekDates: string[] } {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(getLocalDate(d));
  }
  return { weekStart: dates[0], weekEnd: dates[6], weekDates: dates };
}

export function useTeamDailySessions(
  teamId: string | undefined,
  playerIds: string[],
) {
  const { weekStart, weekEnd, weekDates } = useMemo(getIsoWeekDates, []);
  const idsKey = playerIds.slice().sort().join(',');

  const { data: sessionMap = {} } = useQuery<DaySessionMap>({
    queryKey: ['team-daily-sessions', teamId, weekStart, idsKey],
    enabled: !!teamId && playerIds.length > 0,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_sessions')
        .select('user_id, date, touches_logged')
        .in('user_id', playerIds)
        .gte('date', weekStart)
        .lte('date', weekEnd);

      if (error) return {};

      const map: DaySessionMap = {};
      for (const row of data ?? []) {
        if (!map[row.user_id]) map[row.user_id] = {};
        const existing = map[row.user_id][row.date]?.touches ?? 0;
        map[row.user_id][row.date] = { touches: existing + row.touches_logged };
      }
      return map;
    },
  });

  return { sessionMap, weekDates };
}
