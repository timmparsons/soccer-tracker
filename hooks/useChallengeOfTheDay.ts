import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export interface CotdEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  time_seconds: number;
}

export interface ChallengeOfTheDay {
  drill_id: string;
  drill_name: string;
  touches_target: number;
  entries: CotdEntry[];
}

// Deterministically pick an index based on today's date — same for everyone, changes daily
function todayIndex(count: number): number {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return dayOfYear % count;
}

const COTD_TARGET = 100;

export function useChallengeOfTheDay(teamId: string | undefined) {
  return useQuery({
    queryKey: ['challenge-of-the-day', teamId],
    enabled: !!teamId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ChallengeOfTheDay | null> => {
      // Only use beginner/intermediate drills — keeps it accessible
      const { data: drills } = await supabase
        .from('drills')
        .select('id, name')
        .in('difficulty_level', ['beginner', 'intermediate'])
        .order('name', { ascending: true });

      if (!drills?.length) return null;

      const drill = drills[todayIndex(drills.length)] as { id: string; name: string };

      // Team member IDs
      const { data: members } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url')
        .eq('team_id', teamId!)
        .eq('is_coach', false);

      if (!members?.length) return { drill_id: drill.id, drill_name: drill.name, touches_target: COTD_TARGET, entries: [] };

      const memberIds = members.map((m) => m.id);

      // Today's attempts for this drill
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: attempts } = await supabase
        .from('drill_attempts')
        .select('user_id, time_seconds')
        .eq('drill_id', drill.id)
        .eq('touches_target', COTD_TARGET)
        .in('user_id', memberIds)
        .gte('created_at', todayStart.toISOString())
        .order('time_seconds', { ascending: true });

      // Best time per player today
      const bestMap = new Map<string, number>();
      for (const a of (attempts ?? []) as { user_id: string; time_seconds: number }[]) {
        if (!bestMap.has(a.user_id)) bestMap.set(a.user_id, a.time_seconds);
      }

      const entries: CotdEntry[] = Array.from(bestMap.entries()).map(([userId, time_seconds]) => {
        const m = (members as Record<string, string | null>[]).find((p) => p.id === userId);
        return {
          user_id: userId,
          name: (m?.display_name || m?.name || 'Player') as string,
          avatar_url: (m?.avatar_url ?? null) as string | null,
          time_seconds,
        };
      });

      return { drill_id: drill.id, drill_name: drill.name, touches_target: COTD_TARGET, entries };
    },
  });
}
