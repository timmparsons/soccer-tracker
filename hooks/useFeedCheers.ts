import { supabase } from '@/lib/supabase';
import { getDisplayName } from '@/utils/getDisplayName';
import { QueryClient, useQuery } from '@tanstack/react-query';

export interface CheerData {
  count: number;
  names: string[];
}

export function useCheersForItems(feedItemKeys: string[]) {
  const sortedKey = [...feedItemKeys].sort().join(',');
  return useQuery({
    queryKey: ['feed-cheers', sortedKey],
    enabled: feedItemKeys.length > 0,
    queryFn: async (): Promise<Map<string, CheerData>> => {
      const { data } = await (supabase as any)
        .from('feed_cheers')
        .select('feed_item_key, cheered_by_profile_id, profiles!cheered_by_profile_id(name, display_name)')
        .in('feed_item_key', feedItemKeys);

      const map = new Map<string, CheerData>();
      for (const cheer of (data ?? []) as any[]) {
        const name = getDisplayName(cheer.profiles);
        const existing = map.get(cheer.feed_item_key);
        if (existing) {
          existing.count++;
          existing.names.push(name);
        } else {
          map.set(cheer.feed_item_key, { count: 1, names: [name] });
        }
      }
      return map;
    },
  });
}

export function useMyCheerKeys(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-cheer-keys', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Set<string>> => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await (supabase as any)
        .from('feed_cheers')
        .select('feed_item_key')
        .eq('cheered_by_profile_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString());

      return new Set<string>((data ?? []).map((c: any) => c.feed_item_key as string));
    },
  });
}

export async function toggleCheer({
  feedItemKey,
  cheeredByUserId,
  recipientUserId,
  alreadyCheered,
  queryClient,
}: {
  feedItemKey: string;
  cheeredByUserId: string;
  recipientUserId: string;
  alreadyCheered: boolean;
  queryClient: QueryClient;
}): Promise<void> {
  if (alreadyCheered) {
    await (supabase as any)
      .from('feed_cheers')
      .delete()
      .eq('feed_item_key', feedItemKey)
      .eq('cheered_by_profile_id', cheeredByUserId);
  } else {
    await (supabase as any).from('feed_cheers').insert({
      feed_item_key: feedItemKey,
      cheered_by_profile_id: cheeredByUserId,
      recipient_profile_id: recipientUserId,
    });
  }

  queryClient.invalidateQueries({ queryKey: ['feed-cheers'] });
  queryClient.invalidateQueries({ queryKey: ['my-cheer-keys', cheeredByUserId] });
}
