import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { TradingCard } from '@/lib/checkCards';

export type { TradingCard };

export interface UserCard {
  id: string;
  card_id: string;
  earned_at: string;
  source: 'milestone' | 'drop';
  card: TradingCard;
}

export function useAllCards() {
  return useQuery<TradingCard[]>({
    queryKey: ['trading-cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_cards')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: Infinity, // card catalogue never changes at runtime
  });
}

export function useUserCards(userId: string | undefined) {
  return useQuery<UserCard[]>({
    queryKey: ['user-cards', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_cards')
        .select('id, card_id, earned_at, source, card:trading_cards(*)')
        .eq('user_id', userId!)
        .order('earned_at');
      if (error) throw error;
      return (data ?? []) as unknown as UserCard[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
