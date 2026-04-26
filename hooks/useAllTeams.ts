import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface AdminTeam {
  id: string;
  name: string;
  code: string;
  season_number: number;
  created_at: string;
  coach_name: string;
  player_count: number;
  weekly_touches: number;
}

export function useAllTeams(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-all-teams'],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<AdminTeam[]> => {
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, code, season_number, created_at, coach_id')
        .order('created_at', { ascending: false });

      if (teamsError || !teams || teams.length === 0) return [];

      const teamIds = teams.map((t) => t.id);
      const coachIds = [...new Set(teams.map((t) => t.coach_id).filter(Boolean))];

      const todayObj = new Date();
      const weekStartObj = new Date(todayObj);
      weekStartObj.setDate(todayObj.getDate() - todayObj.getDay());
      const weekStart = getLocalDate(weekStartObj);
      const today = getLocalDate();

      const [
        { data: coaches },
        { data: players },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, display_name')
          .in('id', coachIds),
        supabase
          .from('profiles')
          .select('id, team_id')
          .in('team_id', teamIds)
          .eq('is_coach', false),
      ]);

      const playerIds = (players || []).map((p) => p.id);

      const { data: sessions } = playerIds.length
        ? await supabase
            .from('daily_sessions')
            .select('user_id, touches_logged')
            .in('user_id', playerIds)
            .gte('date', weekStart)
            .lte('date', today)
        : { data: [] };

      const coachById: Record<string, { name: string | null; display_name: string | null }> = {};
      for (const c of coaches || []) {
        coachById[c.id] = c;
      }

      const playerTeamMap: Record<string, string> = {};
      const playerCountByTeam: Record<string, number> = {};
      for (const p of players || []) {
        if (!p.team_id) continue;
        playerTeamMap[p.id] = p.team_id;
        playerCountByTeam[p.team_id] = (playerCountByTeam[p.team_id] ?? 0) + 1;
      }

      const touchesByTeam: Record<string, number> = {};
      for (const s of sessions || []) {
        const teamId = playerTeamMap[s.user_id];
        if (teamId) {
          touchesByTeam[teamId] = (touchesByTeam[teamId] ?? 0) + s.touches_logged;
        }
      }

      return teams.map((t) => {
        const coach = t.coach_id ? coachById[t.coach_id] : null;
        return {
          id: t.id,
          name: t.name,
          code: t.code,
          season_number: t.season_number,
          created_at: t.created_at,
          coach_name: coach?.display_name || coach?.name || 'Unknown',
          player_count: playerCountByTeam[t.id] ?? 0,
          weekly_touches: touchesByTeam[t.id] ?? 0,
        };
      });
    },
  });
}
