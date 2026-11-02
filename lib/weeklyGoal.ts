export const DEFAULT_WEEKLY_GOAL_DAYS = 4;

export type WeeklyGoalStatus = 'hit' | 'on-track' | 'at-risk' | 'out-of-reach';

export interface WeeklyGoalProgress {
  goal: number;
  daysTrained: number;
  daysNeeded: number;
  daysLeft: number; // remaining days this week that can still count, today included if not yet trained
  status: WeeklyGoalStatus;
}

interface WeekDayLike {
  isToday: boolean;
  status: 'done' | 'frozen' | 'missed' | 'future';
}

// Frozen days protect the streak but don't count toward the weekly goal —
// the goal is about days actually trained.
export function getWeeklyGoalProgress(weekActivity: WeekDayLike[], goal: number): WeeklyGoalProgress {
  const daysTrained = weekActivity.filter((d) => d.status === 'done').length;
  const daysLeft = weekActivity.filter(
    (d) => d.status === 'future' || (d.isToday && d.status !== 'done'),
  ).length;
  const daysNeeded = Math.max(goal - daysTrained, 0);

  let status: WeeklyGoalStatus;
  if (daysNeeded === 0) status = 'hit';
  else if (daysNeeded > daysLeft) status = 'out-of-reach';
  else if (daysNeeded === daysLeft) status = 'at-risk';
  else status = 'on-track';

  return { goal, daysTrained, daysNeeded, daysLeft, status };
}
