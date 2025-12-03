// lib/xp.ts

// 200 XP per level, 10 levels max (v1)
export const XP_PER_LEVEL = 200;
export const MAX_LEVEL = 10;

// Convert total XP → level + progress
export function getLevelFromXp(totalXp: number) {
  // Raw level before capping
  const rawLevel = Math.floor(totalXp / XP_PER_LEVEL) + 1;

  // Clamp to max level
  const level = Math.min(rawLevel, MAX_LEVEL);

  // XP progress within the current level
  const xpIntoLevel = totalXp % XP_PER_LEVEL;
  const xpForNextLevel = XP_PER_LEVEL;

  return { level, xpIntoLevel, xpForNextLevel };
}

// Optional fun names for the boys
export function getRankName(level: number): string {
  if (level <= 3) return 'Academy Player';
  if (level <= 6) return 'Starter';
  if (level <= 9) return 'Playmaker';
  return 'Master Touch';
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
