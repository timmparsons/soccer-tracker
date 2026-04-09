import { supabase } from '@/lib/supabase';
import { AwardCoinsInput } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function usePlayerCoins(playerId: string | undefined) {
  return useQuery({
    queryKey: ['coins', playerId],
    enabled: !!playerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', playerId!)
        .single();
      if (error) throw error;
      return (data?.coins ?? 0) as number;
    },
  });
}

export function useAwardCoins() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ coachId, playerId, amount, note, playerPushToken }: AwardCoinsInput) => {
      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', playerId)
        .single();
      if (fetchError || !profileData) throw fetchError ?? new Error('Profile not found');

      const newBalance = (profileData.coins ?? 0) + amount;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ coins: newBalance })
        .eq('id', playerId);
      if (updateError) throw updateError;

      const { error: txError } = await supabase
        .from('coin_transactions')
        .insert({ coach_id: coachId, player_id: playerId, amount, note });
      if (txError) throw txError;

      if (playerPushToken) {
        supabase.functions
          .invoke('send-push', {
            body: {
              to: playerPushToken,
              title: 'You earned Champion Points! 🏆',
              body: note
                ? `Your coach awarded you ${amount} Champion Point${amount !== 1 ? 's' : ''}: ${note}`
                : `Your coach awarded you ${amount} Champion Point${amount !== 1 ? 's' : ''}!`,
            },
          })
          .catch((err: unknown) => console.warn('Push notification failed:', err));
      }

      return newBalance;
    },
    onSuccess: (_newBalance, vars) => {
      queryClient.invalidateQueries({ queryKey: ['coins', vars.playerId] });
      queryClient.invalidateQueries({ queryKey: ['profile', vars.playerId] });
    },
  });
}
