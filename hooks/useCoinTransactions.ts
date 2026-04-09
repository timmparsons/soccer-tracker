import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export type CoinTransactionRow = {
  id: string;
  amount: number;
  note: string | null;
  created_at: string;
  coach: { display_name: string | null; name: string | null } | null;
};

export function useCoinTransactions(playerId: string | undefined) {
  return useQuery({
    queryKey: ['coin-transactions', playerId],
    enabled: !!playerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('id, amount, note, created_at, coach:coach_id(display_name, name)')
        .eq('player_id', playerId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as CoinTransactionRow[];
    },
  });
}
