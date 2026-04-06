import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

async function sendPushToUser(userId: string, title: string, body: string) {
  const { data } = await supabase
    .from('profiles')
    .select('expo_push_token')
    .eq('id', userId)
    .single();
  if (!data?.expo_push_token) return;
  await supabase.functions.invoke('send-push', {
    body: { to: data.expo_push_token, title, body },
  });
}

export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';

export interface PlayerChallenge {
  id: string;
  challenger_id: string;
  challenged_id: string;
  touches_target: number;
  time_limit_hours: number;
  status: ChallengeStatus;
  expires_at: string;
  deadline_at: string | null;
  challenger_time_seconds: number | null;
  challenger_completed_at: string | null;
  challenged_time_seconds: number | null;
  challenged_completed_at: string | null;
  winner_id: string | null;
  created_at: string;
  challenger_name?: string;
  challenger_avatar?: string | null;
  challenged_name?: string;
  challenged_avatar?: string | null;
}

export function usePlayerChallenges(userId: string | undefined) {
  return useQuery({
    queryKey: ['player-challenges', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_challenges')
        .select(`
          *,
          challenger:profiles!challenger_id(name, display_name, avatar_url),
          challenged:profiles!challenged_id(name, display_name, avatar_url)
        `)
        .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
        .in('status', ['pending', 'accepted', 'completed'])
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        // Table doesn't exist yet — return empty until DB is set up
        return [] as PlayerChallenge[];
      }

      return (data ?? []).map((row: Record<string, any>) => ({
        ...row,
        challenger_name: row.challenger?.display_name || row.challenger?.name,
        challenger_avatar: row.challenger?.avatar_url ?? null,
        challenged_name: row.challenged?.display_name || row.challenged?.name,
        challenged_avatar: row.challenged?.avatar_url ?? null,
      })) as PlayerChallenge[];
    },
  });
}

export function useAllPlayerChallenges(userId: string | undefined) {
  return useQuery({
    queryKey: ['player-challenges-all', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_challenges')
        .select(`
          *,
          challenger:profiles!challenger_id(name, display_name, avatar_url),
          challenged:profiles!challenged_id(name, display_name, avatar_url)
        `)
        .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) return [] as PlayerChallenge[];

      return (data ?? []).map((row: Record<string, any>) => ({
        ...row,
        challenger_name: row.challenger?.display_name || row.challenger?.name,
        challenger_avatar: row.challenger?.avatar_url ?? null,
        challenged_name: row.challenged?.display_name || row.challenged?.name,
        challenged_avatar: row.challenged?.avatar_url ?? null,
      })) as PlayerChallenge[];
    },
  });
}

export function useSendChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      challengerId,
      challengedId,
      touchesTarget,
      timeLimitHours,
    }: {
      challengerId: string;
      challengedId: string;
      touchesTarget: number;
      timeLimitHours: number;
    }) => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('player_challenges')
        .insert({
          challenger_id: challengerId,
          challenged_id: challengedId,
          touches_target: touchesTarget,
          time_limit_hours: timeLimitHours,
          status: 'pending',
          expires_at: expiresAt,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['player-challenges', vars.challengerId] });
      sendPushToUser(
        vars.challengedId,
        '⚔️ New Challenge!',
        `You've been challenged to ${vars.touchesTarget} touches. You have 24h to accept.`,
      );
    },
  });
}

export function useRespondToChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      challengeId,
      accept,
      timeLimitHours,
    }: {
      challengeId: string;
      accept: boolean;
      timeLimitHours: number;
      challengerId: string; // used in onSuccess only
      responderId: string;  // used in onSuccess only
      responderName: string;
    }) => {
      const update: Record<string, string> = { status: accept ? 'accepted' : 'declined' };
      if (accept) {
        update.deadline_at = new Date(
          Date.now() + timeLimitHours * 60 * 60 * 1000,
        ).toISOString();
      }
      const { error } = await supabase
        .from('player_challenges')
        .update(update)
        .eq('id', challengeId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['player-challenges'] });
      sendPushToUser(
        vars.challengerId,
        vars.accept ? '✅ Challenge Accepted!' : '❌ Challenge Declined',
        vars.accept
          ? `${vars.responderName} accepted your challenge. Game on!`
          : `${vars.responderName} declined your challenge.`,
      );
    },
  });
}

export function useCompleteChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      challengeId,
      userId,
      challengerId,
      challengedId,
      timeTakenSeconds,
      existingChallengerTime,
      existingChallengedTime,
    }: {
      challengeId: string;
      userId: string;
      challengerId: string;
      challengedId: string;
      timeTakenSeconds: number;
      existingChallengerTime: number | null;
      existingChallengedTime: number | null;
    }) => {
      const isChallenger = userId === challengerId;
      const update: Record<string, string | number | null> = isChallenger
        ? {
            challenger_time_seconds: timeTakenSeconds,
            challenger_completed_at: new Date().toISOString(),
          }
        : {
            challenged_time_seconds: timeTakenSeconds,
            challenged_completed_at: new Date().toISOString(),
          };

      const otherTime = isChallenger ? existingChallengedTime : existingChallengerTime;
      if (otherTime !== null) {
        const winnerId =
          timeTakenSeconds <= otherTime
            ? userId
            : isChallenger
              ? challengedId
              : challengerId;
        update.status = 'completed';
        update.winner_id = winnerId;
      }

      const { error } = await supabase
        .from('player_challenges')
        .update(update)
        .eq('id', challengeId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['player-challenges'] });
      // Notify the opponent when both players have now finished
      const otherTime = vars.userId === vars.challengerId
        ? vars.existingChallengedTime
        : vars.existingChallengerTime;
      if (otherTime !== null) {
        const opponentId = vars.userId === vars.challengerId ? vars.challengedId : vars.challengerId;
        sendPushToUser(opponentId, '🏆 Results are in!', 'Tap to see who won the challenge.');
      }
    },
  });
}
