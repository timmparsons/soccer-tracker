// lib/xp.ts

// Progressive leveling - gets MUCH harder as you advance
export function getLevelFromXp(totalXp: number) {
  // XP thresholds for each level - exponential growth
  const levelThresholds = [
    0, // Level 1: 0-299
    300, // Level 2: 300-699 (300 more)
    700, // Level 3: 700-1199 (400 more)
    1200, // Level 4: 1200-1799 (500 more)
    1800, // Level 5: 1800-2499 (600 more)
    2500, // Level 6: 2500-3399 (900 more)
    3400, // Level 7: 3400-4499 (1100 more)
    4600, // Level 8: 4600-5999 (1400 more)
    6000, // Level 9: 6000-7699 (1700 more)
    7700, // Level 10: 7700-9699 (2000 more)
    9700, // Level 11: 9700-12199 (2500 more)
    12200, // Level 12: 12200-15199 (3000 more)
    15200, // Level 13: 15200-18699 (3500 more)
    18700, // Level 14: 18700-22699 (4000 more)
    22700, // Level 15: 22700-27699 (5000 more)
    27700, // Level 16: 27700-33699 (6000 more)
    33700, // Level 17: 33700-40699 (7000 more)
    40700, // Level 18: 40700-48699 (8000 more)
    48700, // Level 19: 48700-57699 (9000 more)
    57700, // Level 20: 57700+ (9000 more)
  ];

  // Find current level
  let level = 1;
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (totalXp >= levelThresholds[i]) {
      level = i + 1;
      break;
    }
  }

  level = Math.min(level, 20); // Cap at level 20

  // Calculate XP progress in current level
  const currentLevelThreshold = levelThresholds[level - 1];
  const nextLevelThreshold =
    levelThresholds[level] || currentLevelThreshold + 10000;

  const xpIntoLevel = totalXp - currentLevelThreshold;
  const xpForNextLevel = nextLevelThreshold - currentLevelThreshold;

  return { level, xpIntoLevel, xpForNextLevel };
}

// Rank names based on level
export function getRankName(level: number): string {
  if (level <= 3) return 'Grassroots';
  if (level <= 6) return 'Club Player';
  if (level <= 9) return 'Academy Player';
  if (level <= 12) return 'First Team Prospect';
  if (level <= 15) return 'Playmaker';
  if (level <= 18) return 'Master Touch';
  return 'Legend';
}

// Get color and icon for each rank
export function getRankBadge(rank: string) {
  switch (rank) {
    case 'Grassroots':
      return { color: '#22c55e', icon: 'leaf-outline' };
    case 'Club Player':
      return { color: '#3b82f6', icon: 'shield-half-outline' };
    case 'Academy Player':
      return { color: '#a855f7', icon: 'school-outline' };
    case 'First Team Prospect':
      return { color: '#f97316', icon: 'flash-outline' };
    case 'Playmaker':
      return { color: '#facc15', icon: 'star-outline' };
    case 'Master Touch':
      return { color: '#e5e7eb', icon: 'trophy-outline' };
    case 'Legend':
      return { color: '#38bdf8', icon: 'diamond-outline' };
    default:
      return { color: '#6b7280', icon: 'help-outline' };
  }
}
