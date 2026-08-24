import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface JugglingRecord {
  id: string;
  name: string;
  avatar_url: string | null;
  high_score: number;
  date_achieved: string;
}

export function useJugglingLeaderboard(
  teamId: string | null | undefined,
  period: 'week' | 'alltime' = 'week',
) {
  return useQuery({
    queryKey: ['team-juggling-leaderboard', teamId, period],
    queryFn: async (): Promise<JugglingRecord[]> => {
      if (!teamId) return [];

      const today = getLocalDate();
      const todayObj = new Date();
      const weekStartObj = new Date();
      weekStartObj.setDate(todayObj.getDate() - todayObj.getDay());
      const weekStartDate = getLocalDate(weekStartObj);

      const { data: teamMembers, error: membersError } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', teamId)
        .eq('is_coach', false)
        .eq('is_test_account', false);

      if (membersError) throw membersError;
      if (!teamMembers || teamMembers.length === 0) return [];

      const memberRecords: JugglingRecord[] = await Promise.all(
        teamMembers.map(async (member) => {
          let query = supabase
            .from('daily_sessions')
            .select('juggle_count, date')
            .eq('user_id', member.id)
            .not('juggle_count', 'is', null)
            .gt('juggle_count', 0)
            .order('juggle_count', { ascending: false })
            .limit(1);

          if (period === 'week') {
            query = query.gte('date', weekStartDate).lte('date', today);
          }

          const { data: bestSession } = await query.single();

          return {
            id: member.id,
            name: member.name || member.display_name || 'Unknown Player',
            avatar_url: member.avatar_url,
            high_score: bestSession?.juggle_count || 0,
            date_achieved: bestSession?.date || getLocalDate(),
          };
        }),
      );

      return memberRecords
        .filter((r) => r.high_score > 0)
        .sort(
          (a, b) => b.high_score - a.high_score || a.name.localeCompare(b.name),
        );
    },
    enabled: !!teamId,
    refetchInterval: 60_000,
  });
}
