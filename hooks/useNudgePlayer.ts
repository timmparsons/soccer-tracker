import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useNudgePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      playerId,
      playerPushToken,
    }: {
      playerId: string;
      teamId: string;
      playerPushToken?: string | null;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ last_nudged_at: new Date().toISOString() })
        .eq('id', playerId);
      if (error) throw error;

      if (playerPushToken) {
        const { error: pushError } = await supabase.functions.invoke('send-push', {
          body: {
            to: playerPushToken,
            title: '👋 Nudge from Coach',
            body: "Your coach noticed you haven't trained today — get some touches in!",
          },
        });
        if (pushError) throw pushError;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['coach-team-players', vars.teamId] });
    },
  });
}
