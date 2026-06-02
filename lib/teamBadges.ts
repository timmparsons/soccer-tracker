export type ChallengeMetric =
  | 'week_touches'
  | 'training_days'
  | 'week_sessions'
  | 'streak_days'
  | 'has_juggled'
  | 'all_in_plus_touches'; // 100% trains + 80% hit touchTarget

export interface WeeklyChallenge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  metric: ChallengeMetric;
  target: number;       // metric value to hit per player
  touchTarget?: number; // only for all_in_plus_touches
  thresholdPct: number; // 0.8 = 80%, 1.0 = 100%
}

export const WEEKLY_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'squad_goal',
    name: 'Squad Goal',
    icon: '',
    color: '#1f89ee',
    description: '80% of the team hit 5,000 touches this week',
    metric: 'week_touches',
    target: 5_000,
    thresholdPct: 0.8,
  },
  {
    id: 'all_in',
    name: 'All In',
    icon: '',
    color: '#FF6B35',
    description: 'Every single player trains at least once this week',
    metric: 'training_days',
    target: 1,
    thresholdPct: 1.0,
  },
  {
    id: 'showing_up',
    name: 'Showing Up',
    icon: '',
    color: '#8B5CF6',
    description: '80% of the team trains 4 or more days this week',
    metric: 'training_days',
    target: 4,
    thresholdPct: 0.8,
  },
  {
    id: 'hat_trick',
    name: 'Hat-trick',
    icon: '',
    color: '#F59E0B',
    description: '80% of the team completes 3 or more separate sessions',
    metric: 'week_sessions',
    target: 3,
    thresholdPct: 0.8,
  },
  {
    id: 'streak_squad',
    name: 'Streak Squad',
    icon: '',
    color: '#10B981',
    description: '80% of the team is on a 3+ day training streak',
    metric: 'streak_days',
    target: 3,
    thresholdPct: 0.8,
  },
  {
    id: 'full_send',
    name: '75 (Hundred) Hard',
    icon: '',
    color: '#ffb724',
    description: '80% of the team hits 7,500 touches this week',
    metric: 'week_touches',
    target: 7_500,
    thresholdPct: 0.8,
  },
  {
    id: 'five_a_week',
    name: 'Five-A-Week',
    icon: '',
    color: '#6366F1',
    description: '80% of the team trains 5 or more days this week',
    metric: 'training_days',
    target: 5,
    thresholdPct: 0.8,
  },
  {
    id: 'juggle_nation',
    name: 'Juggle Nation',
    icon: '',
    color: '#31af4d',
    description: '80% of the team logs at least one juggling session',
    metric: 'has_juggled',
    target: 1,
    thresholdPct: 0.8,
  },
  {
    id: 'monster_week',
    name: 'Monster Week',
    icon: '',
    color: '#EF4444',
    description: '80% of the team smashes 10,000 touches this week',
    metric: 'week_touches',
    target: 10_000,
    thresholdPct: 0.8,
  },
  {
    id: 'all_in_again',
    name: 'All In Again',
    icon: '',
    color: '#EC4899',
    description: 'Everyone trains + 80% hit 3,000 touches — no one sits out',
    metric: 'all_in_plus_touches',
    target: 1,         // everyone must train (training_days ≥ 1)
    touchTarget: 3_000,
    thresholdPct: 0.8,
  },
];

export interface EarnedWeeklyBadge {
  id: string;
  team_id: string;
  badge_type: string; // challenge id
  week_start: string; // YYYY-MM-DD (Sunday)
  earned_at: string;
}

function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export function getCurrentWeekChallenge(): WeeklyChallenge {
  const weekStart = getWeekStart();
  // Stable index based on weeks since a fixed epoch (2024-01-07 = first Sunday)
  const epoch = new Date('2024-01-07T00:00:00').getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weekIndex = Math.floor((new Date(weekStart).getTime() - epoch) / weekMs);
  return WEEKLY_CHALLENGES[((weekIndex % WEEKLY_CHALLENGES.length) + WEEKLY_CHALLENGES.length) % WEEKLY_CHALLENGES.length];
}
