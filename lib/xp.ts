// lib/xp.ts

export const LEVEL_THRESHOLDS = [
  0, 300, 700, 1200, 1800, 2500, 3400, 4600, 6000, 7700,
  9700, 12200, 15200, 18700, 22700, 27700, 33700, 40700, 48700, 57700,
  68200, 79000, 90100, 101500, 113200, 125200, 137500, 150000, 162800, 175900,
  189300, 203000, 217000, 231300, 245900, 260800, 276000, 291500, 307300, 323300,
  339600, 356200, 373100, 390300, 407800, 425600, 443700, 462100, 480800, 500000,
];

export function getLevelFromXp(totalXp: number) {
  const levelThresholds = LEVEL_THRESHOLDS;

  let level = 1;
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (totalXp >= levelThresholds[i]) {
      level = i + 1;
      break;
    }
  }

  level = Math.min(level, 50);

  const currentLevelThreshold = levelThresholds[level - 1];
  const nextLevelThreshold = levelThresholds[level] ?? currentLevelThreshold + 20000;

  const xpIntoLevel = totalXp - currentLevelThreshold;
  const xpForNextLevel = nextLevelThreshold - currentLevelThreshold;

  return { level, xpIntoLevel, xpForNextLevel };
}

export function getRankName(level: number): string {
  if (level <= 5) return 'Grassroots';
  if (level <= 10) return 'Club Player';
  if (level <= 15) return 'Academy Player';
  if (level <= 20) return 'First Team Prospect';
  if (level <= 25) return 'Playmaker';
  if (level <= 30) return 'Elite';
  if (level <= 35) return 'Master Touch';
  if (level <= 40) return 'Professional';
  if (level <= 45) return 'World Class';
  return 'Legend';
}

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
    case 'Elite':
      return { color: '#06b6d4', icon: 'ribbon-outline' };
    case 'Master Touch':
      return { color: '#e5e7eb', icon: 'trophy-outline' };
    case 'Professional':
      return { color: '#f59e0b', icon: 'medal-outline' };
    case 'World Class':
      return { color: '#ec4899', icon: 'planet-outline' };
    case 'Legend':
      return { color: '#38bdf8', icon: 'diamond-outline' };
    default:
      return { color: '#6b7280', icon: 'help-outline' };
  }
}
