import { calculateStreak, FREEZE_EARN_CADENCE_DAYS, MAX_BANKED_FREEZES } from '@/lib/streak';

// Build an array of consecutive YYYY-MM-DD strings, `count` days long, ending
// `endOffset` days before `today` (0 = ends today, 1 = ends yesterday, etc).
function consecutiveDates(today: Date, count: number, endOffset: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - endOffset - i);
    dates.push(toDateStr(d));
  }
  return dates;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateStrOffset(today: Date, offset: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - offset);
  return toDateStr(d);
}

const TODAY = new Date('2026-03-15T12:00:00');

describe('calculateStreak', () => {
  it('returns zeroed stats for no activity', () => {
    expect(calculateStreak([], TODAY)).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      freezesAvailable: 0,
      frozenDates: [],
    });
  });

  it('counts a plain consecutive streak including today', () => {
    const dates = consecutiveDates(TODAY, 5, 0); // today + 4 prior days
    const result = calculateStreak(dates, TODAY);
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
    expect(result.freezesAvailable).toBe(0);
    expect(result.frozenDates).toEqual([]);
  });

  it('does not count today if no session logged yet, but keeps yesterday-ending streak intact', () => {
    const dates = consecutiveDates(TODAY, 5, 1); // ends yesterday, not today
    const result = calculateStreak(dates, TODAY);
    expect(result.currentStreak).toBe(5);
  });

  it('a single gap is bridged by a banked freeze without adding to the streak', () => {
    // 15 active days (days -29..-15), earning 1 freeze at day 14, then a gap
    // at day -14 (bridged by the freeze), then 13 more active days through
    // yesterday. Streak length should reflect only genuinely active days.
    const dates: string[] = [];
    for (let offset = 29; offset >= 15; offset--) dates.push(dateStrOffset(TODAY, offset));
    // offset 14 is the missed day (freeze bridges it)
    for (let offset = 13; offset >= 1; offset--) dates.push(dateStrOffset(TODAY, offset));

    const result = calculateStreak(dates, TODAY);
    const missedDateStr = dateStrOffset(TODAY, 14);

    expect(result.frozenDates).toContain(missedDateStr);
    // 15 + 13 = 28 active days, none of which is the frozen day itself
    expect(result.currentStreak).toBe(28);
  });

  it('a single-day gap with no freeze available breaks the streak', () => {
    const recent = consecutiveDates(TODAY, 3, 0); // last 3 days, no freeze earned yet
    const before = consecutiveDates(TODAY, 2, 5); // an older, disconnected run
    const result = calculateStreak([...before, ...recent], TODAY);
    expect(result.currentStreak).toBe(3);
    expect(result.frozenDates).toEqual([]);
  });

  it('a two-day gap breaks the streak even with freezes banked', () => {
    // Build a long enough run to earn a freeze, then leave a 2-day gap, then a short recent run.
    const older: string[] = [];
    for (let offset = 40; offset >= 20; offset--) older.push(dateStrOffset(TODAY, offset));
    // offsets 19 and 18 are both missed — a 2-day gap
    const recent = consecutiveDates(TODAY, 3, 0);

    const result = calculateStreak([...older, ...recent], TODAY);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBeGreaterThanOrEqual(21);
    expect(result.frozenDates).toEqual([]);
    expect(result.freezesAvailable).toBe(0);
  });

  it('banks a freeze every 14 days, capped at MAX_BANKED_FREEZES', () => {
    // 60 consecutive active days should cap out at MAX_BANKED_FREEZES, not
    // keep accumulating one per 14-day period indefinitely.
    const dates = consecutiveDates(TODAY, 60, 0);
    const result = calculateStreak(dates, TODAY);
    expect(result.freezesAvailable).toBe(MAX_BANKED_FREEZES);
  });

  it('refills a freeze immediately once a banked slot opens, if the cadence already elapsed', () => {
    // Run long enough to sit at the cap with the earn-counter well past 14,
    // then take a single-day gap that spends one freeze — the slot should
    // refill on the same walk rather than waiting another 14 days.
    const older: string[] = [];
    for (let offset = 60; offset >= 20; offset--) older.push(dateStrOffset(TODAY, offset));
    // offset 19 missed (spends 1 of the 2 banked freezes)
    const recent: string[] = [];
    for (let offset = 18; offset >= 1; offset--) recent.push(dateStrOffset(TODAY, offset));

    const result = calculateStreak([...older, ...recent], TODAY);
    expect(result.freezesAvailable).toBe(MAX_BANKED_FREEZES);
  });

  it('longest streak survives a break-and-restart', () => {
    const firstRun: string[] = [];
    for (let offset = 50; offset >= 30; offset--) firstRun.push(dateStrOffset(TODAY, offset)); // 21-day run
    // offsets 29, 28 both missed — breaks the streak (well past any freeze bank)
    const secondRun: string[] = [];
    for (let offset = 5; offset >= 0; offset--) secondRun.push(dateStrOffset(TODAY, offset)); // 6-day run incl today

    const result = calculateStreak([...firstRun, ...secondRun], TODAY);
    expect(result.longestStreak).toBe(21);
    expect(result.currentStreak).toBe(6);
  });

  it('exposes the earn cadence constant used by the app', () => {
    expect(FREEZE_EARN_CADENCE_DAYS).toBe(14);
  });
});
