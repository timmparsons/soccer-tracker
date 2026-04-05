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
