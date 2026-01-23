// lib/teamUnlockables.ts
export interface TeamUnlockable {
  level: number;
  type: 'theme' | 'badge' | 'celebration' | 'title';
  name: string;
  description: string;
  icon: string;
  value?: string;
}

export const TEAM_UNLOCKABLES: TeamUnlockable[] = [
  {
    level: 1,
    type: 'badge',
    name: 'Kickoff Crew',
    description: 'Your journey begins!',
    icon: '⚽',
  },
  {
    level: 2,
    type: 'theme',
    name: 'Pitch Green',
    description: 'Classic grass field vibes',
    icon: '🏟️',
    value: '#10B981',
  },
  {
    level: 3,
    type: 'badge',
    name: 'Hat Trick Heroes',
    description: 'Three levels down!',
    icon: '🎩',
  },
  {
    level: 4,
    type: 'celebration',
    name: 'Goal Celebration',
    description: 'Team records trigger a goal animation',
    icon: '🥅',
  },
  {
    level: 5,
    type: 'title',
    name: 'Rising Squad',
    description: 'Your team earns the "Rising Squad" title',
    icon: '📈',
  },
  {
    level: 6,
    type: 'theme',
    name: 'Champions Blue',
    description: 'The color of winners',
    icon: '🏆',
    value: '#3B82F6',
  },
  {
    level: 7,
    type: 'badge',
    name: 'Week Warriors',
    description: 'A full week of commitment!',
    icon: '⚔️',
  },
  {
    level: 8,
    type: 'celebration',
    name: 'Team Chant',
    description: 'Play your team chant when goals are hit',
    icon: '📣',
  },
  {
    level: 9,
    type: 'badge',
    name: 'Dedication Squad',
    description: 'Consistency is key!',
    icon: '🎯',
  },
  {
    level: 10,
    type: 'title',
    name: 'The Untouchables',
    description: "Double digits! You're untouchable",
    icon: '🔥',
  },
  {
    level: 11,
    type: 'theme',
    name: 'Victory Gold',
    description: 'Shine like champions',
    icon: '🥇',
    value: '#F59E0B',
  },
  {
    level: 12,
    type: 'badge',
    name: 'Perfect Dozen',
    description: 'A full year of excellence!',
    icon: '💯',
  },
  {
    level: 13,
    type: 'celebration',
    name: 'Stadium Roar',
    description: 'Hear the crowd go wild!',
    icon: '🔊',
  },
  {
    level: 14,
    type: 'badge',
    name: 'Fortnight Force',
    description: 'Two weeks of power!',
    icon: '⚡',
  },
  {
    level: 15,
    type: 'title',
    name: 'Legends in Training',
    description: 'Your team is becoming legendary',
    icon: '⭐',
  },
  {
    level: 16,
    type: 'theme',
    name: 'Night Game',
    description: 'Under the Friday night lights',
    icon: '🌙',
    value: '#6366F1',
  },
  {
    level: 17,
    type: 'badge',
    name: 'Dynasty Builders',
    description: 'Building something special',
    icon: '🏛️',
  },
  {
    level: 18,
    type: 'celebration',
    name: 'Victory Dance',
    description: 'Celebrate in style!',
    icon: '💃',
  },
  {
    level: 19,
    type: 'badge',
    name: 'Momentum Masters',
    description: 'Unstoppable momentum!',
    icon: '🚀',
  },
  {
    level: 20,
    type: 'title',
    name: 'Elite Academy',
    description: 'Your team is elite level',
    icon: '🎓',
  },
  {
    level: 21,
    type: 'theme',
    name: 'Red Card Energy',
    description: 'Fierce and focused',
    icon: '🟥',
    value: '#EF4444',
  },
  {
    level: 22,
    type: 'badge',
    name: 'Twenty-Two Strong',
    description: 'Stronger together!',
    icon: '💪',
  },
  {
    level: 23,
    type: 'celebration',
    name: 'Confetti Cannon',
    description: 'Epic celebration for big achievements',
    icon: '🎊',
  },
  {
    level: 24,
    type: 'badge',
    name: 'All-Day Hustlers',
    description: '24/7 dedication!',
    icon: '⏰',
  },
  {
    level: 25,
    type: 'title',
    name: 'Hall of Famers',
    description: 'Your names will be remembered',
    icon: '👑',
  },
  {
    level: 26,
    type: 'theme',
    name: 'World Cup',
    description: 'The colors of glory',
    icon: '🌍',
    value: '#8B5CF6',
  },
  {
    level: 27,
    type: 'badge',
    name: 'Triple Nine',
    description: 'Three 9s of excellence!',
    icon: '9️⃣',
  },
  {
    level: 28,
    type: 'celebration',
    name: 'Fireworks Show',
    description: 'Light up the sky!',
    icon: '🎆',
  },
  {
    level: 29,
    type: 'badge',
    name: 'Almost Thirty',
    description: 'So close to legendary status!',
    icon: '🔜',
  },
  {
    level: 30,
    type: 'title',
    name: 'Touch Masters',
    description: "You've mastered the touch",
    icon: '🥋',
  },
];

export function getUnlockedItems(teamLevel: number): TeamUnlockable[] {
  return TEAM_UNLOCKABLES.filter((item) => item.level <= teamLevel);
}

export function getNextUnlock(teamLevel: number): TeamUnlockable | null {
  return TEAM_UNLOCKABLES.find((item) => item.level > teamLevel) || null;
}

export function getXpForLevel(level: number): number {
  // Linear progression: 5,000 XP per level
  // Level 1 = 0 XP
  // Level 2 = 5,000 XP
  // Level 3 = 10,000 XP
  // etc.
  return (level - 1) * 5000;
}
