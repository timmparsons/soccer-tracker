import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ArchivedSeasonPlayer } from './useArchivedSeasons';

function generateTeamCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueCode(): Promise<string> {
  let code = generateTeamCode();
  // Retry until unique (extremely unlikely to collide but be safe)
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await supabase
      .from('teams')
      .select('id')
      .ilike('code', code)
      .maybeSingle();
    if (!data) break;
    code = generateTeamCode();
  }
  return code;
}

export interface StartNewSeasonInput {
  teamId: string;
  currentSeasonNumber: number;
  currentSeasonStartDate: string;
  finalTeamXp: number;
  finalTeamLevel: number;
  playerStandings: ArchivedSeasonPlayer[];
}

export interface EndSeasonInput {
  teamId: string;
  currentSeasonNumber: number;
  currentSeasonStartDate: string;
}

export function useEndSeason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      currentSeasonNumber,
      currentSeasonStartDate,
    }: EndSeasonInput): Promise<{ newCode: string; newSeasonNumber: number }> => {
      // 1. Fetch team's final XP and level
      const { data: teamData } = await supabase
        .from('teams')
        .select('team_xp, team_level')
        .eq('id', teamId)
        .single();

      const finalTeamXp = teamData?.team_xp ?? 0;
      const finalTeamLevel = teamData?.team_level ?? 1;

      // 2. Fetch non-coach players
      const { data: players } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', teamId)
        .eq('is_coach', false);

      // 3. Aggregate their touches for the season
      const seasonStart = (currentSeasonStartDate ?? '').split('T')[0];
      const playerStandings: ArchivedSeasonPlayer[] = [];

      if (players && players.length > 0) {
        const playerIds = players.map((p) => p.id);
        const { data: sessions } = await supabase
          .from('daily_sessions')
          .select('user_id, touches_logged')
          .in('user_id', playerIds)
          .gte('date', seasonStart);

        const touchesByPlayer: Record<string, number> = {};
        sessions?.forEach((s) => {
          touchesByPlayer[s.user_id] = (touchesByPlayer[s.user_id] ?? 0) + s.touches_logged;
        });

        [...players]
          .map((p) => ({ ...p, total_touches: touchesByPlayer[p.id] ?? 0 }))
          .sort((a, b) => b.total_touches - a.total_touches)
          .forEach((p, idx) => {
            playerStandings.push({
              player_id: p.id,
              name: p.display_name || p.name,
              avatar_url: p.avatar_url,
              total_touches: p.total_touches,
              rank: idx + 1,
            });
          });
      }

      // 4. Archive the season
      const { error: archiveError } = await supabase
        .from('archived_team_seasons')
        .insert({
          team_id: teamId,
          season_number: currentSeasonNumber,
          season_start_date: currentSeasonStartDate,
          season_end_date: new Date().toISOString(),
          final_team_xp: finalTeamXp,
          final_team_level: finalTeamLevel,
          player_standings: playerStandings,
        });

      if (archiveError) throw archiveError;

      // 5. Remove all non-coach players
      await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('team_id', teamId)
        .eq('is_coach', false);

      // 6. Reset the team with a new code
      const newCode = await generateUniqueCode();
      const newSeasonNumber = currentSeasonNumber + 1;

      const { error: updateError } = await supabase
        .from('teams')
        .update({
          team_xp: 0,
          team_level: 1,
          season_number: newSeasonNumber,
          season_start_date: new Date().toISOString(),
          code: newCode,
        })
        .eq('id', teamId);

      if (updateError) throw updateError;

      return { newCode, newSeasonNumber };
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['coach-team', vars.teamId] });
      queryClient.invalidateQueries({ queryKey: ['coach-teams'] });
      queryClient.invalidateQueries({ queryKey: ['team-touches-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['team-juggling-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['archived-seasons', vars.teamId] });
      queryClient.invalidateQueries({ queryKey: ['manage-team-players'] });
      queryClient.invalidateQueries({ queryKey: ['coach-team-player-counts'] });
    },
  });
}

export function useStartNewSeason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      currentSeasonNumber,
      currentSeasonStartDate,
      finalTeamXp,
      finalTeamLevel,
      playerStandings,
    }: StartNewSeasonInput): Promise<{ newCode: string; newSeasonNumber: number }> => {
      // 1. Archive the current season
      const { error: archiveError } = await supabase
        .from('archived_team_seasons')
        .insert({
          team_id: teamId,
          season_number: currentSeasonNumber,
          season_start_date: currentSeasonStartDate,
          season_end_date: new Date().toISOString(),
          final_team_xp: finalTeamXp,
          final_team_level: finalTeamLevel,
          player_standings: playerStandings,
        });

      if (archiveError) throw archiveError;

      // 2. Generate a new unique team code
      const newCode = await generateUniqueCode();
      const newSeasonNumber = currentSeasonNumber + 1;

      // 3. Reset the team for the new season
      const { error: updateError } = await supabase
        .from('teams')
        .update({
          team_xp: 0,
          team_level: 1,
          season_number: newSeasonNumber,
          season_start_date: new Date().toISOString(),
          code: newCode,
        })
        .eq('id', teamId);

      if (updateError) throw updateError;

      return { newCode, newSeasonNumber };
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['coach-team', vars.teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-touches-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['team-juggling-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['archived-seasons', vars.teamId] });
    },
  });
}
