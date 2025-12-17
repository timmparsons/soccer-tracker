import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

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

export function useAuthUser() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return user;
}
