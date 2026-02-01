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
        todaySessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
      const todayTpm = todayMinutes > 0 ? Math.round(todayTouches / todayMinutes) : 0;

      // Get user's daily target
      const { data: targetData } = await supabase
        .from('user_targets')
        .select('daily_target_touches')
        .eq('user_id', userId)
        .single();

      const dailyTarget = targetData?.daily_target_touches || 1000;

      // Get this week's touches (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weekStart = getLocalDate(sevenDaysAgo);

      const { data: weekSessions } = await supabase
        .from('daily_sessions')
        .select('touches_logged, duration_minutes, date')
        .eq('user_id', userId)
        .gte('date', weekStart);

      const weekTouches =
        weekSessions?.reduce((sum, s) => sum + s.touches_logged, 0) || 0;
      const weekMinutes =
        weekSessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0;
      const weekTpm = weekMinutes > 0 ? Math.round(weekTouches / weekMinutes) : 0;

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
              (1000 * 60 * 60 * 24)
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
        `
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
      const { data } = await supabase
        .from('drills')
        .select('*')
        .order('difficulty_level', { ascending: true });
      return data || [];
    },
  });
};

// Time durations for challenges (in seconds)
const CHALLENGE_DURATIONS = [60, 90, 120, 180]; // 1, 1.5, 2, 3 minutes

export const useTodayChallenge = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['today-challenge', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get all available drills
      const { data: drills } = await supabase
        .from('drills')
        .select('*');

      if (!drills || drills.length === 0) {
        return null;
      }

      // Use the current date as a seed for "random" but consistent daily selection
      const today = getLocalDate();
      const seed = today.split('-').reduce((acc, val) => acc + parseInt(val), 0);

      // Pick a random drill based on the date seed
      const drillIndex = seed % drills.length;
      const selectedDrill = drills[drillIndex];

      // Pick a random duration based on the date seed
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
