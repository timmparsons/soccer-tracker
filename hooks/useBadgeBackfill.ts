import { useJugglingRecord, useActiveStreak, useTouchTracking } from '@/hooks/useTouchTracking';
import { useProfile } from '@/hooks/useProfile';
import { checkAndAwardBadges } from '@/lib/checkBadges';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// Silent badge backfill — awards any qualifying badges the user hasn't earned yet.
// Mounted in the tabs layout so it fires after every session insert path
// (they all refresh ['touch-tracking', userId]), not just LogSessionModal.
export function useBadgeBackfill(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile(userId);
  const { data: touchStats } = useTouchTracking(userId);
  const { data: activeStreakStats } = useActiveStreak(userId);
  const { data: jugglePB = 0 } = useJugglingRecord(userId);

  useEffect(() => {
    if (!userId || !touchStats) return;
    checkAndAwardBadges(userId, {
      totalSessions: touchStats.total_sessions ?? 0,
      totalTouches: touchStats.total_touches ?? 0,
      currentStreak: activeStreakStats?.currentStreak ?? 0,
      // If the user already has a juggle PB, treat it as a beaten record so the badge backfills
      jugglesThisSession: jugglePB > 0 ? jugglePB : null,
      previousJugglePB: jugglePB > 0 ? jugglePB - 1 : 0,
      durationMinutes: null,
      sessionsThisWeek: touchStats.this_week_sessions ?? 0,
      teamId: profile?.team_id ?? null,
    }).then((newIds) => {
      if (newIds.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['user-badges', userId] });
      }
    });
  }, [
    userId,
    touchStats?.total_sessions,
    touchStats?.total_touches,
    activeStreakStats?.currentStreak,
    jugglePB,
    profile?.team_id,
  ]);
}
