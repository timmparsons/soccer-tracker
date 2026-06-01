export interface TeamBadgeDefinition {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  repeatable: boolean; // true = weekly (Sun–Sat), false = one-time permanent
}

export const TEAM_BADGES: TeamBadgeDefinition[] = [
  // Weekly repeatable
  {
    id: 'team_squad_active',
    name: 'Squad Active',
    icon: '👟',
    color: '#1f89ee',
    description: '80% of the team trained at least once this week',
    repeatable: true,
  },
  {
    id: 'team_all_in',
    name: 'All In',
    icon: '🔥',
    color: '#FF6B35',
    description: 'The entire team trained this week — nobody left out!',
    repeatable: true,
  },
  {
    id: 'team_5k_week',
    name: '5K Week',
    icon: '⚡',
    color: '#ffb724',
    description: '80% of the team logged 5,000+ touches this week',
    repeatable: true,
  },
  {
    id: 'team_10k_week',
    name: 'Monster Week',
    icon: '💥',
    color: '#EF4444',
    description: '80% of the team logged 10,000+ touches this week',
    repeatable: true,
  },
  {
    id: 'team_perfect_week',
    name: 'Perfect Week',
    icon: '🌟',
    color: '#8B5CF6',
    description: '80% of the team trained every single day this week',
    repeatable: true,
  },
  {
    id: 'team_weekend_warriors',
    name: 'Weekend Warriors',
    icon: '🏆',
    color: '#F59E0B',
    description: '80% of the team trained on both Saturday and Sunday',
    repeatable: true,
  },

  // One-time milestones
  {
    id: 'team_streak_squad',
    name: 'Streak Squad',
    icon: '🔗',
    color: '#10B981',
    description: '80% of the team holds a 3+ day training streak right now',
    repeatable: false,
  },
  {
    id: 'team_hot_squad',
    name: 'Hot Squad',
    icon: '🌡️',
    color: '#EF4444',
    description: '80% of the team is on a 7+ day training streak',
    repeatable: false,
  },
  {
    id: 'team_century_club',
    name: 'Century Club',
    icon: '💯',
    color: '#6366F1',
    description: '80% of the team has completed 100+ training sessions',
    repeatable: false,
  },
  {
    id: 'team_50k_club',
    name: '50K Club',
    icon: '🎯',
    color: '#1f89ee',
    description: '80% of the team has logged 50,000+ touches in total',
    repeatable: false,
  },
  {
    id: 'team_100k_club',
    name: '100K Club',
    icon: '🚀',
    color: '#8B5CF6',
    description: '80% of the team has logged 100,000+ touches in total',
    repeatable: false,
  },
  {
    id: 'team_elite_squad',
    name: 'Elite Squad',
    icon: '👑',
    color: '#F59E0B',
    description: '80% of the team has reached player level 10 or above',
    repeatable: false,
  },
  {
    id: 'team_1m_touches',
    name: 'Touch Machines',
    icon: '🤖',
    color: '#10B981',
    description: 'The team has logged 1,000,000 combined total touches',
    repeatable: false,
  },

  // Coach-awarded (manually inserted, never auto-checked)
  {
    id: 'team_season_champs',
    name: 'Season Champions',
    icon: '🥇',
    color: '#FFD700',
    description: 'Awarded by your coach at the end of the season',
    repeatable: false,
  },
  {
    id: 'team_most_improved',
    name: 'Most Improved',
    icon: '📈',
    color: '#31af4d',
    description: 'Awarded by your coach for outstanding team improvement',
    repeatable: false,
  },
];

export function getTeamBadge(id: string): TeamBadgeDefinition | undefined {
  return TEAM_BADGES.find((b) => b.id === id);
}

// The set of badge IDs that are automatically checked (excludes coach-awarded)
export const AUTO_CHECKED_BADGE_IDS = TEAM_BADGES
  .filter((b) => !['team_season_champs', 'team_most_improved'].includes(b.id))
  .map((b) => b.id);
