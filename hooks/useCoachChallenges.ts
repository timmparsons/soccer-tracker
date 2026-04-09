import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface CoachChallenge {
  id: string;
  coach_id: string;
  player_id: string;
  team_id: string;
  touches_target: number;
  due_date: string; // YYYY-MM-DD
  status: 'active' | 'completed' | 'expired';
  created_at: string;
  player_name?: string;
  player_avatar?: string | null;
}

export function useCoachChallenges(coachId: string | undefined) {
  return useQuery({
    queryKey: ['coach-challenges', coachId],
    enabled: !!coachId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_challenges')
        .select('*, player:profiles!player_id(name, display_name, avatar_url)')
        .eq('coach_id', coachId!)
        .order('created_at', { ascending: false });

      if (error) return [] as CoachChallenge[];

      return (data ?? []).map((row: Record<string, any>) => ({
        ...row,
        player_name: row.player?.display_name || row.player?.name,
        player_avatar: row.player?.avatar_url ?? null,
      })) as CoachChallenge[];
    },
  });
}

export function usePlayerCoachChallenges(playerId: string | undefined) {
  return useQuery({
    queryKey: ['player-coach-challenges', playerId],
    enabled: !!playerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_challenges')
        .select('*, player:profiles!player_id(name, display_name, avatar_url)')
        .eq('player_id', playerId!)
        .in('status', ['active', 'completed'])
        .order('due_date', { ascending: true });

      if (error) return [] as CoachChallenge[];

      return (data ?? []).map((row: Record<string, any>) => ({
        ...row,
        player_name: row.player?.display_name || row.player?.name,
        player_avatar: row.player?.avatar_url ?? null,
      })) as CoachChallenge[];
    },
  });
}

export function useCreateCoachChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      coachId,
      playerId,
      teamId,
      touchesTarget,
      dueDate,
    }: {
      coachId: string;
      playerId: string;
      teamId: string;
      touchesTarget: number;
      dueDate: string;
    }) => {
      const { data, error } = await supabase
        .from('coach_challenges')
        .insert({
          coach_id: coachId,
          player_id: playerId,
          team_id: teamId,
          touches_target: touchesTarget,
          due_date: dueDate,
          status: 'active',
        })
        .select()
        .single();
      if (error) throw error;

      // Send push notification to player
      const { data: playerProfile } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('id', playerId)
        .single();

      if (playerProfile?.expo_push_token) {
        supabase.functions
          .invoke('send-push', {
            body: {
              to: playerProfile.expo_push_token,
              title: 'New Challenge! 🎯',
              body: `Your coach set you a challenge: ${touchesTarget.toLocaleString()} touches by ${dueDate}`,
            },
          })
          .catch((err: unknown) => console.warn('Push notification failed:', err));
      }

      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['coach-challenges', vars.coachId] });
      queryClient.invalidateQueries({ queryKey: ['player-coach-challenges', vars.playerId] });
    },
  });
}

export function useCancelCoachChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId }: { challengeId: string; coachId: string; playerId: string }) => {
      const { error } = await supabase
        .from('coach_challenges')
        .delete()
        .eq('id', challengeId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['coach-challenges', vars.coachId] });
      queryClient.invalidateQueries({ queryKey: ['player-coach-challenges', vars.playerId] });
    },
  });
}

export function useCompleteCoachChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId }: { challengeId: string; coachId: string; playerId: string }) => {
      const { error } = await supabase
        .from('coach_challenges')
        .update({ status: 'completed' })
        .eq('id', challengeId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['coach-challenges', vars.coachId] });
      queryClient.invalidateQueries({ queryKey: ['player-coach-challenges', vars.playerId] });
    },
  });
}
