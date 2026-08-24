export const FREEZE_EARN_CADENCE_DAYS = 14;
export const MAX_BANKED_FREEZES = 2;

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  freezesAvailable: number;
  frozenDates: string[]; // dates inside the current streak that were auto-protected
}

const toLocalDate = (dateStr: string): Date => new Date(dateStr + 'T00:00:00');

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const toDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Walks every calendar day (not just active ones) from the earliest active
// date through yesterday, simulating streak length and freeze bank/spend, so
// freeze earning/consumption is fully derived from activity dates with no
// persisted state. A freeze only ever bridges a single missed day — a second
// consecutive miss right after a bridged day breaks the streak regardless of
// how many freezes are still banked, tracked here via `pendingFrozenDate`.
// Today is handled separately at the end: if today has activity the streak
// includes it, otherwise today isn't a miss yet (it's not over), so the
// settled (through-yesterday) value is shown as current.
export function calculateStreak(activeDates: string[], today: Date = new Date()): StreakStats {
  const activeSet = new Set(activeDates);
  const sortedDates = [...activeSet].sort();

  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, freezesAvailable: 0, frozenDates: [] };
  }

  const todayStr = toDateStr(today);
  const yesterdayLocal = toLocalDate(toDateStr(addDays(today, -1)));

  let streakLength = 0;
  let longestStreak = 0;
  let freezesAvailable = 0;
  let daysSinceLastFreezeEarned = 0;
  let streakActive = false;
  let frozenDates: string[] = [];
  let pendingFrozenDate: string | null = null;

  const earliest = toLocalDate(sortedDates[0]);
  const lastWalkDay = yesterdayLocal < earliest ? earliest : yesterdayLocal;

  const resetStreak = () => {
    streakLength = 0;
    freezesAvailable = 0;
    daysSinceLastFreezeEarned = 0;
    streakActive = false;
    frozenDates = [];
    pendingFrozenDate = null;
  };

  const maybeEarnFreeze = () => {
    if (daysSinceLastFreezeEarned >= FREEZE_EARN_CADENCE_DAYS && freezesAvailable < MAX_BANKED_FREEZES) {
      freezesAvailable++;
      daysSinceLastFreezeEarned = 0;
    }
  };

  for (let cursor = earliest; cursor <= lastWalkDay; cursor = addDays(cursor, 1)) {
    const cursorStr = toDateStr(cursor);

    if (activeSet.has(cursorStr)) {
      pendingFrozenDate = null;
      streakLength++;
      daysSinceLastFreezeEarned++;
      streakActive = true;
      longestStreak = Math.max(longestStreak, streakLength);
      maybeEarnFreeze();
    } else if (streakActive) {
      if (pendingFrozenDate !== null || freezesAvailable === 0) {
        resetStreak();
      } else {
        freezesAvailable--;
        pendingFrozenDate = cursorStr;
        frozenDates.push(cursorStr);
        daysSinceLastFreezeEarned++;
        maybeEarnFreeze();
      }
    }
    // else: inactive day before the streak has started yet — no-op
  }

  let currentStreak = streakLength;
  if (activeSet.has(todayStr)) {
    currentStreak++;
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  return { currentStreak, longestStreak, freezesAvailable, frozenDates };
}
