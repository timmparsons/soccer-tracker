export type Juggles = {
  id: string;
  user_id: string;

  // Core performance tracking
  high_score: number;
  last_score: number;
  attempts_count: number;
  sessions_count: number;
  average_score: number;

  // Progress & streaks
  last_session_date: string | null;
  last_session_duration: number;
  best_streak_date: string | null;
  streak_days: number;
  best_daily_streak: number;

  // Gamification
  xp_earned: number;
  level: number;

  // Metadata
  created_at: string;
  updated_at: string;
};
