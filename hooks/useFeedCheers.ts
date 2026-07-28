import { supabase } from '@/lib/supabase';
import { getDisplayName } from '@/utils/getDisplayName';
import { QueryClient, useQuery } from '@tanstack/react-query';

export const REACTION_TYPES = ['cheer', 'fire', 'fireworks', 'strong'] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTION_EMOJI: Record<ReactionType, string> = {
  cheer: '👏',
  fire: '🔥',
  fireworks: '🎉',
  strong: '💪',
};

export interface Reactor {
  name: string;
  reactionType: ReactionType;
}

export interface CheerData {
  count: number;
  names: string[];
  counts: Record<ReactionType, number>;
  reactors: Reactor[];
}

function emptyCounts(): Record<ReactionType, number> {
  return { cheer: 0, fire: 0, fireworks: 0, strong: 0 };
}

export function useCheersForItems(feedItemKeys: string[]) {
  const sortedKey = [...feedItemKeys].sort().join(',');
  return useQuery({
    queryKey: ['feed-cheers', sortedKey],
    enabled: feedItemKeys.length > 0,
    queryFn: async (): Promise<Map<string, CheerData>> => {
      const { data } = await (supabase as any)
        .from('feed_cheers')
        .select('feed_item_key, cheered_by_profile_id, reaction_type, profiles!cheered_by_profile_id(name, display_name)')
        .in('feed_item_key', feedItemKeys);

      const map = new Map<string, CheerData>();
      for (const cheer of (data ?? []) as any[]) {
        const name = getDisplayName(cheer.profiles);
        const reactionType = (cheer.reaction_type ?? 'cheer') as ReactionType;
        const existing = map.get(cheer.feed_item_key);
        if (existing) {
          existing.count++;
          existing.names.push(name);
          existing.counts[reactionType]++;
          existing.reactors.push({ name, reactionType });
        } else {
          const counts = emptyCounts();
          counts[reactionType] = 1;
          map.set(cheer.feed_item_key, { count: 1, names: [name], counts, reactors: [{ name, reactionType }] });
        }
      }
      return map;
    },
  });
}

export function useMyReactions(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-cheer-keys', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Map<string, ReactionType>> => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await (supabase as any)
        .from('feed_cheers')
        .select('feed_item_key, reaction_type')
        .eq('cheered_by_profile_id', userId)
        .gte('created_at', sevenDaysAgo.toISOString());

      return new Map<string, ReactionType>(
        (data ?? []).map((c: any) => [c.feed_item_key as string, (c.reaction_type ?? 'cheer') as ReactionType]),
      );
    },
  });
}

export async function setReaction({
  feedItemKey,
  cheeredByUserId,
  recipientUserId,
  reactionType,
  currentReactionType,
  queryClient,
}: {
  feedItemKey: string;
  cheeredByUserId: string;
  recipientUserId: string;
  reactionType: ReactionType;
  currentReactionType: ReactionType | undefined;
  queryClient: QueryClient;
}): Promise<void> {
  if (currentReactionType === reactionType) {
    await (supabase as any)
      .from('feed_cheers')
      .delete()
      .eq('feed_item_key', feedItemKey)
      .eq('cheered_by_profile_id', cheeredByUserId);
  } else {
    await (supabase as any)
      .from('feed_cheers')
      .upsert(
        {
          feed_item_key: feedItemKey,
          cheered_by_profile_id: cheeredByUserId,
          recipient_profile_id: recipientUserId,
          reaction_type: reactionType,
        },
        { onConflict: 'feed_item_key,cheered_by_profile_id' },
      );
  }

  queryClient.invalidateQueries({ queryKey: ['feed-cheers'] });
  queryClient.invalidateQueries({ queryKey: ['my-cheer-keys', cheeredByUserId] });
}
