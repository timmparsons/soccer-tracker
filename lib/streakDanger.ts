const DANGER_HOUR = 19; // 7pm local — pill/UI turns danger state

export function isStreakInDanger(
  currentStreak: number,
  todayTouches: number,
  now: Date = new Date(),
): boolean {
  return currentStreak > 0 && todayTouches === 0 && now.getHours() >= DANGER_HOUR;
}
