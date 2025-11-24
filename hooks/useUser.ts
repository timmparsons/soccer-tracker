import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function useUser() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      // Uses cached session for instant return
      const {
        data: { session },
      } = await supabase.auth.getSession();

      return session?.user ?? null;
    },
    staleTime: Infinity,
  });

  // Update the React Query cache whenever auth state changes
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        queryClient.setQueryData(['user'], session?.user ?? null);
      }
    );

    return () => subscription.subscription.unsubscribe();
  }, [queryClient]);

  return {
    user: query.data,
    isLoadingUser: query.isLoading,
    ...query,
  };
}
