// lib/xp.ts

// Leveling curve
export const XP_PER_LEVEL = 150;
export const MAX_LEVEL = 20;

// Level calculation
export function getLevelFromXp(totalXp: number) {
  // Raw level calculation
  const rawLevel = Math.floor(totalXp / XP_PER_LEVEL) + 1;

  // Clamp the level between 1 and MAX
  const level = Math.min(rawLevel, MAX_LEVEL);

  // XP progress into the current level
  const xpIntoLevel = totalXp % XP_PER_LEVEL;
  const xpForNextLevel = XP_PER_LEVEL;

  return { level, xpIntoLevel, xpForNextLevel };
}
// Optional fun names for the boys
export function getRankName(level: number): string {
  if (level <= 3) return 'Grassroots';
  if (level <= 6) return 'Club Player';
  if (level <= 9) return 'Academy Player';
  if (level <= 12) return 'First Team Prospect';
  if (level <= 15) return 'Playmaker';
  if (level <= 18) return 'Master Touch';
  return 'Legend';
}

// Events they can earn XP from (v1: juggling only)
export type XpEventType =
  | 'SESSION_COMPLETED'
  | 'DAILY_TARGET_HIT'
  | 'NEW_PERSONAL_BEST'
  | 'STREAK_3_DAYS'
  | 'STREAK_7_DAYS';

// Map an event → XP amount
export function getXpForEvent(type: XpEventType): number {
  switch (type) {
    case 'SESSION_COMPLETED':
      return 20;
    case 'DAILY_TARGET_HIT':
      return 30;
    case 'NEW_PERSONAL_BEST':
      return 50;
    case 'STREAK_3_DAYS':
      return 50;
    case 'STREAK_7_DAYS':
      return 100;
    default:
      return 0;
  }
}

export function getRankBadge(rank: string) {
  switch (rank) {
    case 'Grassroots':
      return { color: '#22c55e', icon: 'leaf-outline' };
    case 'Club Player':
      return { color: '#3b82f6', icon: 'shield-half' };
    case 'Academy Player':
      return { color: '#a855f7', icon: 'school' };
    case 'First Team Prospect':
      return { color: '#f97316', icon: 'flash' };
    case 'Playmaker':
      return { color: '#facc15', icon: 'star' };
    case 'Master Touch':
      return { color: '#e5e7eb', icon: 'trophy' };
    case 'Legend':
      return { color: '#38bdf8', icon: 'diamond' };
    default:
      return { color: '#6b7280', icon: 'help' };
  }
}
