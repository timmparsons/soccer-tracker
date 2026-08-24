import { logTabataSession, TabataSessionInput } from '@/lib/tabata';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useTabataSession(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: TabataSessionInput) => {
      if (!userId) throw new Error('No user ID');
      return logTabataSession(userId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-tabata-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['team-touches-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      queryClient.invalidateQueries({ queryKey: ['active-streak', userId] });
    },
  });
}
