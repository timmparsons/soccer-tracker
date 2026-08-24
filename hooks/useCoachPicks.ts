import { supabase } from '@/lib/supabase';
import { sendPush } from '@/utils/sendPush';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface CoachPick {
  id: string;
  team_id: string;
  coach_id: string;
  player_id: string;
  date: string;
  created_at: string;
}

export function useCoachPickForDate(teamId: string | undefined, date: string) {
  return useQuery({
    queryKey: ['coach-pick', teamId, date],
    enabled: !!teamId,
    queryFn: async (): Promise<CoachPick | null> => {
      const { data, error } = await supabase
        .from('coach_picks')
        .select('*')
        .eq('team_id', teamId!)
        .eq('date', date)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAwardCoachPick() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      teamId,
      coachId,
      playerId,
      date,
      playerPushToken,
    }: {
      teamId: string;
      coachId: string;
      playerId: string;
      date: string;
      playerPushToken?: string | null;
    }) => {
      await supabase.from('coach_picks').delete().eq('team_id', teamId).eq('date', date);

      const { error } = await supabase.from('coach_picks').insert({
        team_id: teamId,
        coach_id: coachId,
        player_id: playerId,
        date,
      });
      if (error) throw error;

      if (playerPushToken) {
        sendPush(playerPushToken, "🌟 Coach's Choice!", "You're today's Coach's Choice — great work out there!");
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['coach-pick', vars.teamId, vars.date] });
    },
  });
}

export function useRemoveCoachPick() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, date }: { teamId: string; date: string }) => {
      const { error } = await supabase.from('coach_picks').delete().eq('team_id', teamId).eq('date', date);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['coach-pick', vars.teamId, vars.date] });
    },
  });
}
