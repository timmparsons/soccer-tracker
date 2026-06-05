import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { useQuery } from '@tanstack/react-query';

export interface TeamAccountabilityPlayer {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  todayMissionComplete: boolean;
  todayTouches: number;
  dailyTouchGoal: number;
  dailyTouchGoalComplete: boolean;
  threeDayStreakCount: number;
  threeDayStreakComplete: boolean;
  weeklyMissionCount: number;
  weeklyMissionGoal: number;
  weeklyMissionComplete: boolean;
}

export interface TeamAccountabilityChallenge {
  id: string;
  title: string;
  subtitle: string;
  completedCount: number;
  totalCount: number;
  players: TeamAccountabilityPlayer[];
}

export function useTeamAccountability(teamId: string | null | undefined) {
  return useQuery({
    queryKey: ['team-accountability', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const todayObj = new Date();
      const today = getLocalDate(todayObj);
      const yesterday = getLocalDate(new Date(todayObj.getTime() - 86_400_000));
      const dayBefore = getLocalDate(new Date(todayObj.getTime() - 2 * 86_400_000));

      const weekStartObj = new Date(todayObj);
      weekStartObj.setDate(todayObj.getDate() - todayObj.getDay());
      const weekStart = getLocalDate(weekStartObj);

      const { data: members } = await supabase
        .from('profiles')
        .select('id, name, display_name, avatar_url, daily_target')
        .eq('team_id', teamId)
        .eq('is_coach', false);

      if (!members || members.length === 0) return [];

      const memberIds = members.map((m) => m.id);

      const [
        { data: missionRows },
        { data: todaySessionRows },
        { data: recentSessionRows },
        { data: weeklyMissionRows },
      ] = await Promise.all([
        supabase
          .from('daily_challenge_completions')
          .select('user_id')
          .in('user_id', memberIds)
          .eq('completed_date', today),

        supabase
          .from('daily_sessions')
          .select('user_id, touches_logged')
          .in('user_id', memberIds)
          .eq('date', today),

        supabase
          .from('daily_sessions')
          .select('user_id, date')
          .in('user_id', memberIds)
          .gte('date', dayBefore)
          .lte('date', today),

        supabase
          .from('daily_challenge_completions')
          .select('user_id')
          .in('user_id', memberIds)
          .gte('completed_date', weekStart)
          .lte('completed_date', today),
      ]);

      const missionDoneSet = new Set((missionRows ?? []).map((r) => r.user_id));

      const touchesByUser: Record<string, number> = {};
      for (const s of todaySessionRows ?? []) {
        touchesByUser[s.user_id] = (touchesByUser[s.user_id] ?? 0) + (s.touches_logged ?? 0);
      }

      const trainedDaysByUser: Record<string, Set<string>> = {};
      for (const s of recentSessionRows ?? []) {
        if (!trainedDaysByUser[s.user_id]) trainedDaysByUser[s.user_id] = new Set();
        trainedDaysByUser[s.user_id].add(s.date);
      }

      const weeklyMissionsByUser: Record<string, number> = {};
      for (const m of weeklyMissionRows ?? []) {
        weeklyMissionsByUser[m.user_id] = (weeklyMissionsByUser[m.user_id] ?? 0) + 1;
      }

      const players: TeamAccountabilityPlayer[] = members.map((m) => {
        const dailyTouchGoal = m.daily_target ?? 1000;
        const todayTouches = touchesByUser[m.id] ?? 0;
        const trainedDays = trainedDaysByUser[m.id] ?? new Set();
        const threeDayCount = [today, yesterday, dayBefore].filter((d) => trainedDays.has(d)).length;
        const weeklyCount = weeklyMissionsByUser[m.id] ?? 0;

        return {
          userId: m.id,
          displayName: m.display_name || m.name || 'Player',
          avatarUrl: m.avatar_url,
          todayMissionComplete: missionDoneSet.has(m.id),
          todayTouches,
          dailyTouchGoal,
          dailyTouchGoalComplete: todayTouches >= dailyTouchGoal,
          threeDayStreakCount: threeDayCount,
          threeDayStreakComplete: threeDayCount >= 3,
          weeklyMissionCount: weeklyCount,
          weeklyMissionGoal: 5,
          weeklyMissionComplete: weeklyCount >= 5,
        };
      });

      // Sort each challenge: completed players first
      const sortedByMission = [...players].sort((a, b) => Number(b.todayMissionComplete) - Number(a.todayMissionComplete));
      const sortedByTouch = [...players].sort((a, b) => Number(b.dailyTouchGoalComplete) - Number(a.dailyTouchGoalComplete));
      const sortedByStreak = [...players].sort((a, b) => b.threeDayStreakCount - a.threeDayStreakCount);
      const sortedByWeekly = [...players].sort((a, b) => b.weeklyMissionCount - a.weeklyMissionCount);

      const touchGoalLabel = players.length > 0
        ? `${(players[0].dailyTouchGoal).toLocaleString()} touches today`
        : '1,000 touches today';

      const challenges: TeamAccountabilityChallenge[] = [
        {
          id: 'mission_squad',
          title: 'Mission Squad',
          subtitle: "Complete today's mission",
          completedCount: players.filter((p) => p.todayMissionComplete).length,
          totalCount: players.length,
          players: sortedByMission,
        },
        {
          id: 'touch_goal',
          title: 'Touch Goal Squad',
          subtitle: `Reach ${touchGoalLabel}`,
          completedCount: players.filter((p) => p.dailyTouchGoalComplete).length,
          totalCount: players.length,
          players: sortedByTouch,
        },
        {
          id: 'streak_squad',
          title: '3-Day Streak Squad',
          subtitle: 'Train 3 days in a row',
          completedCount: players.filter((p) => p.threeDayStreakComplete).length,
          totalCount: players.length,
          players: sortedByStreak,
        },
        {
          id: 'weekly_missions',
          title: 'Weekly Mission Squad',
          subtitle: 'Complete 5 missions this week',
          completedCount: players.filter((p) => p.weeklyMissionComplete).length,
          totalCount: players.length,
          players: sortedByWeekly,
        },
      ];

      return challenges;
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 2,
  });
}
