import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface PlayerStats {
  id: string;
  name: string;
  display_name: string;
  avatar_url: string | null;
  expo_push_token: string | null;
  last_nudged_at: string | null;
  today_touches: number;
  yesterday_touches: number;
  week_touches: number;
  total_touches: number;
  total_sessions: number;
  last_session_date: string | null;
  current_streak: number;
  daily_target: number;
  week_minutes: number;
  week_tpm: number;
  days_active_this_week: number;
  best_juggle: number;
}

export function useCoachTeamPlayers(teamId: string | undefined) {
  return useQuery({
    queryKey: ['coach-team-players', teamId],
    enabled: !!teamId,
    refetchInterval: 30_000,
    queryFn: async (): Promise<PlayerStats[]> => {
      // Get all players on the team (excluding coaches)
      const { data: players, error: playersError } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url, expo_push_token, last_nudged_at')
        .eq('team_id', teamId!)
        .eq('is_coach', false);

      if (playersError) throw playersError;
      if (!players || players.length === 0) return [];

      const today = getLocalDate();
      const yesterdayObj = new Date();
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      const yesterday = getLocalDate(yesterdayObj);
      const todayObj = new Date();
      const weekStartObj = new Date(todayObj);
      weekStartObj.setDate(todayObj.getDate() - todayObj.getDay()); // rewind to Sunday
      const weekStart = getLocalDate(weekStartObj);

      const playerIds = players.map((p) => p.id);

      // Fetch sessions per-player to avoid the 1000-row server cap on batched queries.
      // Window must stay well beyond any realistic streak length, or streaks longer
      // than the window get silently truncated at the window edge (not a real gap).
      const streakWindowStart = new Date();
      streakWindowStart.setDate(streakWindowStart.getDate() - 400);
      const streakWindowStartStr = getLocalDate(streakWindowStart);

      const [playerSessionResults, { data: allTargetsRaw }] = await Promise.all([
        Promise.all(
          players.map((player) =>
            supabase
              .from('daily_sessions')
              .select('user_id, touches_logged, duration_minutes, date, created_at, juggle_count')
              .eq('user_id', player.id)
              .gte('date', streakWindowStartStr)
              .order('date', { ascending: false })
              .then(({ data }) => ({ playerId: player.id, sessions: data ?? [] }))
          )
        ),
        supabase
          .from('user_targets')
          .select('user_id, daily_target_touches')
          .in('user_id', playerIds),
      ]);

      // Build lookup maps
      type SessionRow = {
        user_id: string;
        touches_logged: number;
        duration_minutes: number | null;
        date: string;
        created_at: string;
        juggle_count: number | null;
      };
      const sessionsByPlayer: Record<string, SessionRow[]> = {};
      for (const { playerId, sessions } of playerSessionResults) {
        sessionsByPlayer[playerId] = sessions as SessionRow[];
      }
      const targetByPlayer: Record<string, number> = {};
      for (const t of allTargetsRaw || []) {
        targetByPlayer[t.user_id] = t.daily_target_touches;
      }

      const playersWithStats: PlayerStats[] = players.map((player) => {
        const allSessions = sessionsByPlayer[player.id] || [];
        const weekSessions = allSessions.filter((s) => s.date >= weekStart);

        const todayTouches = allSessions
          .filter((s) => s.date === today)
          .reduce((sum, s) => sum + s.touches_logged, 0);

        const yesterdayTouches = allSessions
          .filter((s) => s.date === yesterday)
          .reduce((sum, s) => sum + s.touches_logged, 0);

        const weekTouches = weekSessions.reduce((sum, s) => sum + s.touches_logged, 0);
        const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        const weekTpm = weekMinutes > 0 ? Math.round(weekTouches / weekMinutes) : 0;
        const totalTouches = allSessions.reduce((sum, s) => sum + s.touches_logged, 0);
        const uniqueWeekDays = new Set(weekSessions.map((s) => s.date)).size;

        const bestJuggle = allSessions.reduce((max, s) => {
          const jc = s.juggle_count ?? 0;
          return jc > max ? jc : max;
        }, 0);

        // Calculate streak (fixed: use local midnight to avoid UTC offset issues)
        const uniqueDates = [...new Set(allSessions.map((s) => s.date))].sort().reverse();
        let streak = 0;
        let checkDate = new Date();

        for (const dateStr of uniqueDates) {
          const sessionDate = new Date(dateStr + 'T00:00:00');
          const diffDays = Math.floor(
            (checkDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diffDays <= 1) {
            streak++;
            checkDate = sessionDate;
          } else {
            break;
          }
        }

        return {
          id: player.id,
          name: player.name,
          display_name: player.display_name,
          avatar_url: player.avatar_url,
          expo_push_token: player.expo_push_token,
          last_nudged_at: player.last_nudged_at,
          today_touches: todayTouches,
          yesterday_touches: yesterdayTouches,
          week_touches: weekTouches,
          total_touches: totalTouches,
          total_sessions: allSessions.length,
          last_session_date: allSessions[0]?.created_at || null,
          current_streak: streak,
          daily_target: targetByPlayer[player.id] || 1000,
          week_minutes: weekMinutes,
          week_tpm: weekTpm,
          days_active_this_week: Math.min(uniqueWeekDays, 7),
          best_juggle: bestJuggle,
        };
      });

      // Sort by week touches (most active first)
      return playersWithStats.sort((a, b) => b.week_touches - a.week_touches);
    },
  });
}
