import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface UnviewedReaction {
  id: string;
  activity_key: string;
  reactor_name: string;
  created_at: string;
}

export function useUnviewedReactions(userId: string | undefined) {
  return useQuery({
    queryKey: ['activity-reactions-unviewed', userId],
    enabled: !!userId,
    staleTime: 30000,
    queryFn: async (): Promise<UnviewedReaction[]> => {
      const { data } = await supabase
        .from('activity_reactions')
        .select('id, activity_key, reactor_name, created_at')
        .eq('recipient_id', userId!)
        .is('viewed_at', null)
        .order('created_at', { ascending: false });
      return (data ?? []) as UnviewedReaction[];
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
      const { data } = await supabase
        .from('activity_reactions')
        .select('activity_key')
        .eq('reactor_id', userId!)
        .gte('created_at', sevenDaysAgo.toISOString());
      return new Set(data?.map((r: { activity_key: string }) => r.activity_key) ?? []);
    },
  });
}

export async function markReactionsViewed(ids: string[]) {
  if (ids.length === 0) return;
  await supabase
    .from('activity_reactions')
    .update({ viewed_at: new Date().toISOString() })
    .in('id', ids);
}

export async function toggleReaction(params: {
  activityKey: string;
  recipientId: string;
  reactorId: string;
  reactorName: string;
  alreadyReacted: boolean;
}) {
  const { activityKey, recipientId, reactorId, reactorName, alreadyReacted } = params;
  if (alreadyReacted) {
    await supabase
      .from('activity_reactions')
      .delete()
      .eq('activity_key', activityKey)
      .eq('reactor_id', reactorId);
  } else {
    await supabase.from('activity_reactions').upsert(
      { activity_key: activityKey, recipient_id: recipientId, reactor_id: reactorId, reactor_name: reactorName },
      { onConflict: 'activity_key,reactor_id' },
    );
  }
}
