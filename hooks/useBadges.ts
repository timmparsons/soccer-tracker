import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Badge {
  id: string;
  category: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
}

export interface UserBadge {
  badge_id: string;
  earned_at: string;
  badge: Badge;
}

export function useAllBadges() {
  return useQuery<Badge[]>({
    queryKey: ['badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: Infinity, // badge definitions never change at runtime
  });
}

export function useLeaderboardWinCount(userId: string | undefined) {
  return useQuery<number>({
    queryKey: ['leaderboard-wins', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { count } = await supabase
        .from('leaderboard_wins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId!);
      return count ?? 0;
    },
  });
}

export function useUserBadges(userId: string | undefined) {
  return useQuery<UserBadge[]>({
    queryKey: ['user-badges', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at, badge:badges(*)')
        .eq('user_id', userId!)
        .order('earned_at');
      if (error) throw error;
      return (data ?? []) as UserBadge[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
