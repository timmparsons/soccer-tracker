import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface DailyStats {
  today_touches: number;
  today_minutes: number;
  today_tpm: number;
  daily_target: number;
  this_week_touches: number;
  this_week_minutes: number;
  this_week_tpm: number;
  current_streak: number;
  last_session_time: string | null;
}

interface SessionLog {
  id: string;
  date: string;
  drill_name: string | null;
  touches_logged: number;
  duration_minutes: number | null;
  created_at: string;
}

// Helper to get local date in YYYY-MM-DD format
const getLocalDate = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useTouchTracking = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['touch-tracking', userId],
    queryFn: async (): Promise<DailyStats> => {
      if (!userId) throw new Error('No user ID');

      // Get today's total touches (using local date)
      const today = getLocalDate();

      const { data: todaySessions } = await supabase
        .from('daily_sessions')
        .select('touches_logged, duration_minutes')
        .eq('user_id', userId)
        .eq('date', today);

      const todayTouches =
        todaySessions?.reduce((sum, s) => sum + s.touches_logged, 0) || 0;
      const todayMinutes =
        todaySessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) ||
        0;
      const todayTpm =
        todayMinutes > 0 ? Math.round(todayTouches / todayMinutes) : 0;

      // Get user's daily target
      const { data: targetData } = await supabase
        .from('user_targets')
        .select('daily_target_touches')
        .eq('user_id', userId)
        .single();

      const dailyTarget = targetData?.daily_target_touches || 1000;

      // Get this week's touches (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const weekStart = getLocalDate(sevenDaysAgo);

      const { data: weekSessions } = await supabase
        .from('daily_sessions')
        .select('touches_logged, duration_minutes, date')
        .eq('user_id', userId)
        .gte('date', weekStart);

      const weekTouches =
        weekSessions?.reduce((sum, s) => sum + s.touches_logged, 0) || 0;
      const weekMinutes =
        weekSessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) ||
        0;
      const weekTpm =
        weekMinutes > 0 ? Math.round(weekTouches / weekMinutes) : 0;

      // Calculate streak (consecutive days with at least 1 session)
      const { data: allSessions } = await supabase
        .from('daily_sessions')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      let streak = 0;
      if (allSessions && allSessions.length > 0) {
        const uniqueDates = [...new Set(allSessions.map((s) => s.date))];
        let checkDate = new Date();

        for (const dateStr of uniqueDates) {
          const sessionDate = new Date(dateStr);
          const daysDiff = Math.floor(
            (checkDate.getTime() - sessionDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (daysDiff === 0 || daysDiff === 1) {
            streak++;
            checkDate = sessionDate;
          } else {
            break;
          }
        }
      }

      // Get last session time
      const { data: lastSession } = await supabase
        .from('daily_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        today_touches: todayTouches,
        today_minutes: todayMinutes,
        today_tpm: todayTpm,
        daily_target: dailyTarget,
        this_week_touches: weekTouches,
        this_week_minutes: weekMinutes,
        this_week_tpm: weekTpm,
        current_streak: streak,
        last_session_time: lastSession?.created_at || null,
      };
    },
    enabled: !!userId,
  });
};

export const useRecentSessions = (userId: string | undefined, limit = 10) => {
  return useQuery({
    queryKey: ['recent-sessions', userId, limit],
    queryFn: async (): Promise<SessionLog[]> => {
      if (!userId) throw new Error('No user ID');

      const { data } = await supabase
        .from('daily_sessions')
        .select(
          `
          id,
          date,
          touches_logged,
          duration_minutes,
          created_at,
          drills (name)
        `,
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return (data || []).map((s: any) => ({
        id: s.id,
        date: s.date,
        drill_name: s.drills?.name || null,
        touches_logged: s.touches_logged,
        duration_minutes: s.duration_minutes,
        created_at: s.created_at,
      }));
    },
    enabled: !!userId,
  });
};

export const useDrills = () => {
  return useQuery({
    queryKey: ['drills'],
    queryFn: async () => {
      const { data } = await supabase.from('drills').select('*');

      // Sort by difficulty: beginner → intermediate → advanced
      const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
      return (data || []).sort((a, b) => {
        const orderA =
          difficultyOrder[a.difficulty_level as keyof typeof difficultyOrder] ||
          99;
        const orderB =
          difficultyOrder[b.difficulty_level as keyof typeof difficultyOrder] ||
          99;
        return orderA - orderB;
      });
    },
  });
};

// Time durations for challenges (in seconds)
const CHALLENGE_DURATIONS = [180, 240, 300, 360]; // 3, 4, 5, 6 minutes

export const useJugglingRecord = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['juggling-record', userId],
    queryFn: async (): Promise<number> => {
      if (!userId) throw new Error('No user ID');

      const { data } = await supabase
        .from('daily_sessions')
        .select('juggle_count')
        .eq('user_id', userId)
        .not('juggle_count', 'is', null)
        .order('juggle_count', { ascending: false })
        .limit(1)
        .single();

      return data?.juggle_count || 0;
    },
    enabled: !!userId,
  });
};

export const useChallengeStats = (
  userId: string | undefined,
  todayDrillId: string | null | undefined,
) => {
  return useQuery({
    queryKey: ['challenge-stats', userId, todayDrillId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');

      const today = getLocalDate();

      // Check if completed today's specific challenge
      let completedToday = false;
      if (todayDrillId) {
        const { data: todayChallenge } = await supabase
          .from('daily_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('date', today)
          .eq('drill_id', todayDrillId)
          .limit(1);
        completedToday = (todayChallenge?.length ?? 0) > 0;
      }

      // Calculate consecutive challenge streak (days with drill_id NOT NULL)
      const { data: challengeSessions } = await supabase
        .from('daily_sessions')
        .select('date')
        .eq('user_id', userId)
        .not('drill_id', 'is', null)
        .order('date', { ascending: false });

      let challengeStreak = 0;
      if (challengeSessions && challengeSessions.length > 0) {
        const uniqueDates = [...new Set(challengeSessions.map((s) => s.date))];
        let checkDate = new Date();

        for (const dateStr of uniqueDates) {
          const sessionDate = new Date(dateStr);
          const daysDiff = Math.floor(
            (checkDate.getTime() - sessionDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (daysDiff === 0 || daysDiff === 1) {
            challengeStreak++;
            checkDate = sessionDate;
          } else {
            break;
          }
        }
      }

      // Count distinct drill_ids ever logged
      const { data: drillSessions } = await supabase
        .from('daily_sessions')
        .select('drill_id')
        .eq('user_id', userId)
        .not('drill_id', 'is', null);

      const uniqueDrillsCompleted = new Set(
        drillSessions?.map((s) => s.drill_id) || [],
      ).size;

      // Total drills available
      const { count: totalDrillsAvailable } = await supabase
        .from('drills')
        .select('*', { count: 'exact', head: true });

      return {
        completedToday,
        challengeStreak,
        uniqueDrillsCompleted,
        totalDrillsAvailable: totalDrillsAvailable || 0,
      };
    },
    enabled: !!userId,
  });
};

export const useTodayChallenge = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['today-challenge', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch drills and user's all-time total touches in parallel
      const [{ data: drills }, { data: allSessions }] = await Promise.all([
        supabase.from('drills').select('*'),
        supabase.from('daily_sessions').select('touches_logged').eq('user_id', userId),
      ]);

      if (!drills || drills.length === 0) return null;

      // Determine difficulty tier from all-time total touches
      // < 10,000  → beginner fundamentals
      // 10k–50k   → intermediate challenges
      // > 50,000  → random from any tier (fully unlocked)
      const totalTouches = allSessions?.reduce((sum, s) => sum + (s.touches_logged || 0), 0) ?? 0;
      const tier =
        totalTouches >= 50000 ? null :          // null = all tiers
        totalTouches >= 10000 ? 'intermediate' :
        'beginner';

      // Filter pool to tier (null means all drills)
      const pool = tier ? drills.filter((d) => d.difficulty_level === tier) : drills;
      const selectedPool = pool.length > 0 ? pool : drills;

      // Use the current date as a seed for consistent daily selection
      const today = getLocalDate();
      const seed = today
        .split('-')
        .reduce((acc, val) => acc + parseInt(val), 0);

      const drillIndex = seed % selectedPool.length;
      const selectedDrill = selectedPool[drillIndex];

      const durationIndex = (seed + drillIndex) % CHALLENGE_DURATIONS.length;
      const challengeDuration = CHALLENGE_DURATIONS[durationIndex];

      return {
        ...selectedDrill,
        challenge_duration_seconds: challengeDuration,
      };
    },
    enabled: !!userId,
  });
};
