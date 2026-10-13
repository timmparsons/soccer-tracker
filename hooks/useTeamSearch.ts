import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface TeamResult {
  id: string;
  name: string;
  club_id: string | null;
  coach_id: string | null;
  club_name: string | null;
}

// Only coached teams are searchable, which hides orphaned test teams. With no
// query, lists the given club's teams; typing 2+ chars searches every team so
// a wrong club pick can't hide the right one.
export function useTeamSearch(query: string, clubId?: string | null) {
  const trimmed = query.trim();
  const browsingClub = trimmed.length === 0 && !!clubId;
  const searching = trimmed.length >= 2;

  return useQuery({
    queryKey: ['team-search', trimmed, browsingClub ? clubId : null],
    staleTime: 30 * 1000,
    enabled: browsingClub || searching,
    queryFn: async (): Promise<TeamResult[]> => {
      let request = supabase
        .from('teams')
        .select('id, name, club_id, coach_id, clubs(name)')
        .not('coach_id', 'is', null);
      request = searching
        ? request.ilike('name', `%${trimmed}%`)
        : request.eq('club_id', clubId!);
      const { data, error } = await request.order('name').limit(15);
      if (error) throw error;
      return (data ?? []).map((t) => {
        const club = t.clubs as { name: string } | { name: string }[] | null;
        return {
          id: t.id,
          name: t.name,
          club_id: t.club_id,
          coach_id: t.coach_id,
          club_name: (Array.isArray(club) ? club[0]?.name : club?.name) ?? null,
        };
      });
    },
  });
}
