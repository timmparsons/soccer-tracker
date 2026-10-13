import { TeamResult } from '@/hooks/useTeamSearch';
import { supabase } from '@/lib/supabase';
import { getDisplayName } from '@/utils/getDisplayName';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export type JoinableTeam = Pick<TeamResult, 'id' | 'name' | 'club_id' | 'coach_id'>;

export async function findTeamByCode(code: string): Promise<JoinableTeam | null> {
  const { data } = await supabase
    .from('teams')
    .select('id, name, club_id, coach_id')
    .ilike('code', code.trim())
    .maybeSingle();
  return data;
}

// Fire-and-forget so a failed push never blocks the join itself
export async function notifyCoachOfJoin(team: JoinableTeam, playerId: string): Promise<void> {
  if (!team.coach_id) return;
  try {
    const { data: people } = await supabase
      .from('profiles')
      .select('id, name, display_name, expo_push_token')
      .in('id', [team.coach_id, playerId]);
    const coach = people?.find((p) => p.id === team.coach_id);
    const player = people?.find((p) => p.id === playerId);
    if (!coach?.expo_push_token) return;
    await supabase.functions.invoke('send-push', {
      body: {
        to: coach.expo_push_token,
        title: 'New player joined',
        body: `${getDisplayName(player ?? undefined, 'A new player')} just joined ${team.name}`,
      },
    });
  } catch (err) {
    console.warn('Coach join push failed:', err);
  }
}

export function useJoinTeam(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (team: JoinableTeam) => {
      if (!userId) throw new Error('You must be logged in to join a team');
      // Also adopt the team's club, if it has one
      const { error } = await supabase
        .from('profiles')
        .update(team.club_id ? { team_id: team.id, club_id: team.club_id } : { team_id: team.id })
        .eq('id', userId);
      if (error) throw error;
      notifyCoachOfJoin(team, userId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
        queryClient.invalidateQueries({ queryKey: ['team', userId] }),
      ]);
    },
  });
}
