export const DAILY_TOUCH_CAP = 10000;

export interface DailyCapResult {
  credited: number;
  capped: boolean;
  atCap: boolean;
}

export function creditTouchesForDailyCap(
  todayTotal: number,
  submitted: number,
  cap: number = DAILY_TOUCH_CAP
): DailyCapResult {
  const remaining = Math.max(0, cap - todayTotal);
  if (remaining <= 0) return { credited: 0, capped: true, atCap: true };
  const credited = Math.min(submitted, remaining);
  return { credited, capped: credited < submitted, atCap: false };
}
