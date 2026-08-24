import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface TabataRecord {
  id: string;
  name: string;
  avatar_url: string | null;
  max_reps: number;
  date_achieved: string;
}

export function useTabataLeaderboard(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['team-tabata-leaderboard', teamId],
    queryFn: async (): Promise<TabataRecord[]> => {
      if (!teamId) return [];

      const { data: teamMembers, error: membersError } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', teamId)
        .eq('is_coach', false)
        .eq('is_test_account', false);

      if (membersError) throw membersError;
      if (!teamMembers || teamMembers.length === 0) return [];

      const memberRecords: TabataRecord[] = await Promise.all(
        teamMembers.map(async (member) => {
          const { data: bestResult } = await (supabase as any)
            .from('tabata_results')
            .select('total_reps, date')
            .eq('user_id', member.id)
            .order('total_reps', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: member.id,
            name: member.name || member.display_name || 'Unknown Player',
            avatar_url: member.avatar_url,
            max_reps: bestResult?.total_reps || 0,
            date_achieved: bestResult?.date || '',
          };
        }),
      );

      return memberRecords
        .filter((r) => r.max_reps > 0)
        .sort(
          (a, b) => b.max_reps - a.max_reps || a.name.localeCompare(b.name),
        );
    },
    enabled: !!teamId,
    refetchInterval: 60_000,
  });
}
