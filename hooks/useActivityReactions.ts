import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDisplayName } from '@/utils/getDisplayName';
import { useQuery } from '@tanstack/react-query';

const CHEERS_VIEWED_KEY = 'cheers_last_viewed_at';

export interface UnviewedReaction {
  id: string;
  activity_key: string;
  reactor_name: string;
  created_at: string;
}

function decodeActivityKey(key: string): { label: string; type: 'session' | 'win' | 'street' | 'other' } {
  if (key.startsWith('session-')) {
    const match = /(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(key);
    if (match) {
      const date = new Date(match[1] + 'T12:00:00Z');
      return {
        label: `Training session · ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        type: 'session',
      };
    }
    return { label: 'Training session', type: 'session' };
  }
  if (key.startsWith('win-')) return { label: '1v1 win', type: 'win' };
  if (key.startsWith('street-')) return { label: 'Street challenge', type: 'street' };
  return { label: 'Activity', type: 'other' };
}

export interface CheerNotification {
  id: string;
  activity_key: string;
  activity_label: string;
  activity_type: 'session' | 'win' | 'street' | 'other';
  reactor_name: string;
  created_at: string;
  is_new: boolean;
}

export function useUnviewedReactions(userId: string | undefined) {
  return useQuery({
    queryKey: ['activity-reactions-unviewed', userId],
    enabled: !!userId,
    staleTime: 30000,
    queryFn: async (): Promise<UnviewedReaction[]> => {
      const lastViewed = await AsyncStorage.getItem(CHEERS_VIEWED_KEY);

      const query = (supabase as any)
        .from('feed_cheers')
        .select('feed_item_key, cheered_by_profile_id, created_at')
        .eq('recipient_profile_id', userId!)
        .order('created_at', { ascending: false })
        .limit(30);

      if (lastViewed) {
        query.gt('created_at', lastViewed);
      }

      const { data } = await query;

      return ((data ?? []) as any[]).map((row) => ({
        id: `${row.feed_item_key}-${row.cheered_by_profile_id}`,
        activity_key: row.feed_item_key,
        reactor_name: '',
        created_at: row.created_at,
      }));
    },
  });
}

export function useAllMyRecentCheers(userId: string | undefined) {
  return useQuery({
    queryKey: ['all-my-cheers', userId],
    enabled: !!userId,
    staleTime: 30000,
    queryFn: async (): Promise<CheerNotification[]> => {
      const lastViewed = await AsyncStorage.getItem(CHEERS_VIEWED_KEY);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await (supabase as any)
        .from('feed_cheers')
        .select('feed_item_key, cheered_by_profile_id, created_at, profiles!cheered_by_profile_id(name, display_name)')
        .eq('recipient_profile_id', userId!)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      return ((data ?? []) as any[]).map((row) => {
        const decoded = decodeActivityKey(row.feed_item_key);
        return {
          id: `${row.feed_item_key}-${row.cheered_by_profile_id}`,
          activity_key: row.feed_item_key,
          activity_label: decoded.label,
          activity_type: decoded.type,
          reactor_name: getDisplayName(row.profiles),
          created_at: row.created_at,
          is_new: lastViewed ? new Date(row.created_at) > new Date(lastViewed) : true,
        };
      });
    },
  });
}

export function useMyReactionKeys(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-reaction-keys', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Set<string>> => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data } = await (supabase as any)
        .from('feed_cheers')
        .select('feed_item_key')
        .eq('cheered_by_profile_id', userId!)
        .gte('created_at', sevenDaysAgo.toISOString());
      return new Set(data?.map((r: { feed_item_key: string }) => r.feed_item_key) ?? []);
    },
  });
}

export async function markReactionsViewed(_ids: string[]) {
  await AsyncStorage.setItem(CHEERS_VIEWED_KEY, new Date().toISOString());
}

export async function toggleReaction(params: {
  activityKey: string;
  recipientId: string;
  reactorId: string;
  reactorName: string;
  alreadyReacted: boolean;
}) {
  const { activityKey, recipientId, reactorId, alreadyReacted } = params;
  if (alreadyReacted) {
    await (supabase as any)
      .from('feed_cheers')
      .delete()
      .eq('feed_item_key', activityKey)
      .eq('cheered_by_profile_id', reactorId);
  } else {
    // Verify against DB before inserting to prevent double-reactions across devices
    const { data: existing } = await (supabase as any)
      .from('feed_cheers')
      .select('feed_item_key')
      .eq('feed_item_key', activityKey)
      .eq('cheered_by_profile_id', reactorId)
      .maybeSingle();

    if (!existing) {
      await (supabase as any).from('feed_cheers').insert({
        feed_item_key: activityKey,
        cheered_by_profile_id: reactorId,
        recipient_profile_id: recipientId,
      });
    }
  }
}
