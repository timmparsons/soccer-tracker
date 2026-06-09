import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export type FeedEventType =
  | 'personal_best'
  | 'challenge_sent'
  | 'challenge_accepted'
  | 'challenge_won'
  | 'challenge_lost'
  | 'badge_earned'
  | 'weekly_challenge_completed'
  | 'leaderboard_top'
  | 'training_session'
  | 'group_challenge_sent'
  | 'group_challenge_completed';

export interface FeedEvent {
  id: string;
  team_id: string;
  actor_id: string;
  actor_name: string;
  actor_avatar: string | null;
  event_type: FeedEventType;
  payload: Record<string, unknown>;
  created_at: string;
}

export function useFeedEvents(teamId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel(`feed-events-${teamId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_events', filter: `team_id=eq.${teamId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['feed-events', teamId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [teamId, queryClient]);

  return useQuery({
    queryKey: ['feed-events', teamId],
    enabled: !!teamId,
    staleTime: 30_000,
    queryFn: async (): Promise<FeedEvent[]> => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('feed_events')
        .select('*, actor:profiles!actor_id(name, display_name, avatar_url)')
        .eq('team_id', teamId!)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return [];

      if (!data) return [];

      return (data as Record<string, unknown>[]).map((row) => {
        const actor = row.actor as Record<string, string | null> | null;
        return {
          id: row.id as string,
          team_id: row.team_id as string,
          actor_id: row.actor_id as string,
          actor_name: actor?.display_name || actor?.name || 'Player',
          actor_avatar: actor?.avatar_url ?? null,
          event_type: row.event_type as FeedEventType,
          payload: (row.payload as Record<string, unknown>) ?? {},
          created_at: row.created_at as string,
        };
      });
    },
  });
}
