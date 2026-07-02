import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { QueryClient, useQuery } from '@tanstack/react-query';

const FREESTYLE_TOUCHES = 50;

export interface StreetChallenge {
  id: string;
  name: string;
  description: string;
}

export interface StreetCategory {
  label: string;
  subtitle?: string;
  challenges: StreetChallenge[];
}

export function useStreetChallengesData() {
  return useQuery({
    queryKey: ['street-challenges'],
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<Record<string, StreetCategory>> => {
      const { data, error } = await (supabase as any)
        .from('freestyle_challenges')
        .select('id, name, description, category_key, category_label, category_subtitle, sort_order')
        .eq('active', true)
        .order('category_key')
        .order('sort_order');

      if (error) throw error;

      const grouped: Record<string, StreetCategory> = {};
      for (const row of data ?? []) {
        if (!grouped[row.category_key]) {
          grouped[row.category_key] = {
            label: row.category_label,
            subtitle: row.category_subtitle ?? undefined,
            challenges: [],
          };
        }
        grouped[row.category_key].challenges.push({
          id: row.id,
          name: row.name,
          description: row.description,
        });
      }
      return grouped;
    },
  });
}

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
  const today = getLocalDate();

  await Promise.all([
    (supabase as any).from('street_challenge_completions').insert({
      profile_id: userId,
      challenge_id: challenge.id,
      challenge_name: challenge.name,
      category,
    }),
    supabase.from('daily_sessions').insert({
      user_id: userId,
      touches_logged: FREESTYLE_TOUCHES,
      date: today,
      drill_id: null,
      duration_minutes: 10,
      juggle_count: null,
    }),
  ]);

  queryClient.invalidateQueries({ queryKey: ['street-completions-mine', userId] });
  queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
  queryClient.invalidateQueries({ queryKey: ['touch-tracking', userId] });
  queryClient.invalidateQueries({ queryKey: ['recent-sessions', userId] });
}
