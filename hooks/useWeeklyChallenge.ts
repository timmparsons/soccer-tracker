import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface WeeklyChallenge {
  id: string;
  team_id: string;
  coach_id: string;
  drill_id: string;
  drill_name: string;
  touches_target: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

function getWeekBounds(): { start: string; end: string } {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return {
    start: sunday.toISOString().split('T')[0],
    end: saturday.toISOString().split('T')[0],
  };
}

export function getWeeklyChallengeDaysRemaining(endDate: string): number {
  const end = new Date(endDate + 'T23:59:59');
  const today = new Date();
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function useWeeklyChallenge(teamId: string | undefined) {
  return useQuery({
    queryKey: ['weekly-challenge', teamId],
    enabled: !!teamId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<WeeklyChallenge | null> => {
      const { start, end } = getWeekBounds();
      const { data, error } = await supabase
        .from('weekly_challenges')
        .select('*, drills(name)')
        .eq('team_id', teamId!)
        .lte('start_date', end)
        .gte('end_date', start)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const row = data as Record<string, unknown>;
      const drill = row.drills as Record<string, string> | null;
      return {
        id: row.id as string,
        team_id: row.team_id as string,
        coach_id: row.coach_id as string,
        drill_id: row.drill_id as string,
        drill_name: drill?.name ?? 'Drill',
        touches_target: row.touches_target as number,
        start_date: row.start_date as string,
        end_date: row.end_date as string,
        created_at: row.created_at as string,
      };
    },
  });
}

export function useCreateWeeklyChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      teamId,
      coachId,
      drillId,
      touchesTarget,
      startDate,
      endDate,
    }: {
      teamId: string;
      coachId: string;
      drillId: string;
      touchesTarget: number;
      startDate: string;
      endDate: string;
    }) => {
      const { data, error } = await supabase
        .from('weekly_challenges')
        .insert({ team_id: teamId, coach_id: coachId, drill_id: drillId, touches_target: touchesTarget, start_date: startDate, end_date: endDate })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['weekly-challenge', vars.teamId] });
    },
  });
}
