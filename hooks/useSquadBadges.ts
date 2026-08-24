import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface UserSquadBadge {
  squadBadgeId: string;
  badgeName: string;
  badgeIcon: string;
  targetCount: number;
  achievedAt: string;
}

export function useUserSquadBadges(userId: string | undefined) {
  return useQuery<UserSquadBadge[]>({
    queryKey: ['user-squad-badges', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_squad_badges')
        .select('squad_badge:squad_badges(id, badge_name, badge_icon, target_count, achieved_at)')
        .eq('profile_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;

      return (data ?? [])
        .filter((row: any) => row.squad_badge)
        .map((row: any) => ({
          squadBadgeId: row.squad_badge.id,
          badgeName: row.squad_badge.badge_name,
          badgeIcon: row.squad_badge.badge_icon,
          targetCount: row.squad_badge.target_count,
          achievedAt: row.squad_badge.achieved_at,
        }));
    },
    staleTime: 1000 * 60 * 5,
  });
}
