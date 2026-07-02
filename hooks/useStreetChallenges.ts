import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { QueryClient, useQuery } from '@tanstack/react-query';
import type { StreetChallenge } from '@/constants/streetChallenges';

export function useMyStreetCompletions(userId: string | undefined) {
  return useQuery({
    queryKey: ['street-completions-mine', userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Set<string>> => {
      const today = getLocalDate();
      const todayStart = `${today}T00:00:00.000Z`;
      const todayEnd = `${today}T23:59:59.999Z`;

      const { data } = await (supabase as any)
        .from('street_challenge_completions')
        .select('challenge_id')
        .eq('profile_id', userId)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      return new Set<string>((data ?? []).map((c: any) => c.challenge_id as string));
    },
  });
}

export async function logStreetCompletion(
  userId: string,
  challenge: StreetChallenge,
  category: string,
  queryClient: QueryClient,
): Promise<void> {
  await (supabase as any).from('street_challenge_completions').insert({
    profile_id: userId,
    challenge_id: challenge.id,
    challenge_name: challenge.name,
    category,
  });

  queryClient.invalidateQueries({ queryKey: ['street-completions-mine', userId] });
  queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
}
