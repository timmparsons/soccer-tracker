import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

function sendPush(token: string, title: string, body: string) {
  supabase.functions
    .invoke('send-push', { body: { to: token, title, body } })
    .catch(() => {});
}

export interface GroupChallengeParticipant {
  id: string;
  user_id: string;
  time_seconds: number | null;
  completed_at: string | null;
  name?: string;
  avatar_url?: string | null;
  push_token?: string | null;
}

export interface GroupChallenge {
  id: string;
  created_by: string;
  team_id: string;
  touches_target: number;
  time_limit_hours: number;
  deadline_at: string;
  status: 'active' | 'completed';
  created_at: string;
  participants: GroupChallengeParticipant[];
}

export function useGroupChallenges(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`group-challenges-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_challenge_participants' }, () => {
        queryClient.invalidateQueries({ queryKey: ['group-challenges', userId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_challenges' }, () => {
        queryClient.invalidateQueries({ queryKey: ['group-challenges', userId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: ['group-challenges', userId],
    enabled: !!userId,
    staleTime: 0,
    queryFn: async (): Promise<GroupChallenge[]> => {
      // Step 1: find all group_challenge_ids this user is part of
      const { data: myRows, error: myError } = await supabase
        .from('group_challenge_participants')
        .select('group_challenge_id')
        .eq('user_id', userId!);

      if (myError || !myRows || myRows.length === 0) return [];

      const ids = myRows.map((r) => r.group_challenge_id as string);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Step 2: fetch those challenges with all participants + profiles
      const { data, error } = await supabase
        .from('group_challenges')
        .select(`
          *,
          participants:group_challenge_participants(
            id,
            user_id,
            time_seconds,
            completed_at,
            profile:profiles!user_id(name, display_name, avatar_url, expo_push_token)
          )
        `)
        .in('id', ids)
        .or(`status.eq.active,and(status.eq.completed,created_at.gte.${sevenDaysAgo})`)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return (data as Record<string, any>[]).map((row) => ({
        id: row.id,
        created_by: row.created_by,
        team_id: row.team_id,
        touches_target: row.touches_target,
        time_limit_hours: row.time_limit_hours,
        deadline_at: row.deadline_at,
        status: row.status,
        created_at: row.created_at,
        participants: ((row.participants as Record<string, any>[]) ?? []).map((p) => ({
          id: p.id,
          user_id: p.user_id,
          time_seconds: p.time_seconds ?? null,
          completed_at: p.completed_at ?? null,
          name: p.profile?.display_name || p.profile?.name || 'Unknown',
          avatar_url: p.profile?.avatar_url ?? null,
          push_token: p.profile?.expo_push_token ?? null,
        })),
      }));
    },
  });
}

export function useCreateGroupChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      creatorId,
      teamId,
      touchesTarget,
      timeLimitHours,
      participants,
      creatorName,
    }: {
      creatorId: string;
      teamId: string;
      touchesTarget: number;
      timeLimitHours: number;
      participants: Array<{ id: string; push_token: string | null }>;
      creatorName: string;
    }) => {
      const deadlineAt = new Date(Date.now() + timeLimitHours * 60 * 60 * 1000).toISOString();

      const { data: challenge, error: challengeError } = await supabase
        .from('group_challenges')
        .insert({
          created_by: creatorId,
          team_id: teamId,
          touches_target: touchesTarget,
          time_limit_hours: timeLimitHours,
          deadline_at: deadlineAt,
          status: 'active',
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      const allUserIds = [creatorId, ...participants.map((p) => p.id)];
      const { error: participantError } = await supabase
        .from('group_challenge_participants')
        .insert(allUserIds.map((uid) => ({ group_challenge_id: challenge.id, user_id: uid })));

      if (participantError) throw participantError;

      return { challenge, participants, creatorName, touchesTarget, timeLimitHours };
    },
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ['group-challenges', vars.creatorId] });
      result.participants.forEach((p) => {
        if (p.push_token) {
          sendPush(
            p.push_token,
            '⚔️ Group Challenge!',
            `${result.creatorName} invited you to a ${result.touchesTarget}-touch race. You have ${result.timeLimitHours}h!`,
          );
        }
      });
    },
  });
}

export function useCompleteGroupChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupChallengeId,
      userId,
      timeTakenSeconds,
      touchesTarget,
      allParticipants,
    }: {
      groupChallengeId: string;
      userId: string;
      timeTakenSeconds: number;
      touchesTarget: number;
      allParticipants: GroupChallengeParticipant[];
    }) => {
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('group_challenge_participants')
        .update({ time_seconds: timeTakenSeconds, completed_at: now })
        .eq('group_challenge_id', groupChallengeId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      const updatedParticipants = allParticipants.map((p) =>
        p.user_id === userId ? { ...p, completed_at: now } : p,
      );
      const allDone = updatedParticipants.every((p) => p.completed_at !== null);

      if (allDone) {
        await supabase
          .from('group_challenges')
          .update({ status: 'completed' })
          .eq('id', groupChallengeId);
      }

      const today = getLocalDate();
      const { error: sessionError } = await supabase.from('daily_sessions').insert({
        user_id: userId,
        touches_logged: touchesTarget,
        date: today,
        drill_id: null,
        duration_minutes: null,
        juggle_count: null,
      });
      if (sessionError) throw sessionError;

      return { allDone, allParticipants, userId };
    },
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ['group-challenges', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['touch-tracking', vars.userId] });
      queryClient.invalidateQueries({ queryKey: ['recent-sessions', vars.userId] });
      if (result.allDone) {
        result.allParticipants
          .filter((p) => p.user_id !== result.userId && p.push_token)
          .forEach((p) => {
            sendPush(p.push_token!, '🏆 Results are in!', 'Everyone finished — tap to see who won!');
          });
      }
    },
  });
}

export function useDeleteGroupChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupChallengeId }: { groupChallengeId: string; userId: string }) => {
      const { error } = await supabase
        .from('group_challenges')
        .delete()
        .eq('id', groupChallengeId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['group-challenges', vars.userId] });
    },
  });
}
