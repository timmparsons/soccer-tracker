import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Suggestion {
  id: string;
  body: string;
  created_at: string;
  vote_count: number;
  user_has_voted: boolean;
}

async function fetchSuggestions(userId: string): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from('suggestions')
    .select('id, body, created_at, suggestion_votes(user_id)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row) => ({
      id: row.id,
      body: row.body,
      created_at: row.created_at,
      vote_count: (row.suggestion_votes as { user_id: string }[]).length,
      user_has_voted: (row.suggestion_votes as { user_id: string }[]).some(
        (v) => v.user_id === userId,
      ),
    }))
    .sort((a, b) => b.vote_count - a.vote_count);
}

export function useSuggestions(userId: string | undefined) {
  return useQuery({
    queryKey: ['suggestions', userId],
    queryFn: () => fetchSuggestions(userId!),
    enabled: !!userId,
  });
}

export function useSubmitSuggestion(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase
        .from('suggestions')
        .insert({ user_id: userId, body: body.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });
}

export function useToggleVote(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      suggestionId,
      hasVoted,
    }: {
      suggestionId: string;
      hasVoted: boolean;
    }) => {
      if (hasVoted) {
        const { error } = await supabase
          .from('suggestion_votes')
          .delete()
          .eq('suggestion_id', suggestionId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('suggestion_votes')
          .insert({ suggestion_id: suggestionId, user_id: userId });
        if (error) throw error;
      }
    },
    onMutate: async ({ suggestionId, hasVoted }) => {
      await queryClient.cancelQueries({ queryKey: ['suggestions'] });
      const previous = queryClient.getQueryData<Suggestion[]>(['suggestions', userId]);

      queryClient.setQueryData<Suggestion[]>(['suggestions', userId], (old) =>
        (old ?? []).map((s) =>
          s.id === suggestionId
            ? {
                ...s,
                vote_count: hasVoted ? s.vote_count - 1 : s.vote_count + 1,
                user_has_voted: !hasVoted,
              }
            : s,
        ),
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['suggestions', userId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });
}
