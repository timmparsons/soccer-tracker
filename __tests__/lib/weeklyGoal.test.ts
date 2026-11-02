import { getWeeklyGoalProgress } from '@/lib/weeklyGoal';

type Status = 'done' | 'frozen' | 'missed' | 'future';

// Build a Sun→Sat week from a 7-char pattern: d=done, f=frozen, m=missed,
// u=future. `todayIndex` marks which day is today.
function week(pattern: string, todayIndex: number) {
  const map: Record<string, Status> = { d: 'done', f: 'frozen', m: 'missed', u: 'future' };
  return pattern.split('').map((c, i) => ({ isToday: i === todayIndex, status: map[c] }));
}

describe('getWeeklyGoalProgress', () => {
  it('is hit once trained days reach the goal', () => {
    const p = getWeeklyGoalProgress(week('dmddduu', 4), 4);
    expect(p.status).toBe('hit');
    expect(p.daysTrained).toBe(4);
    expect(p.daysNeeded).toBe(0);
  });

  it('counts today as a day left when not yet trained', () => {
    const p = getWeeklyGoalProgress(week('dmdmmuu', 4), 4);
    expect(p.daysLeft).toBe(3);
    expect(p.daysNeeded).toBe(2);
    expect(p.status).toBe('on-track');
  });

  it('does not count today as a day left once trained', () => {
    const p = getWeeklyGoalProgress(week('dmmmduu', 4), 4);
    expect(p.daysLeft).toBe(2);
    expect(p.status).toBe('at-risk');
  });

  it('is at-risk when every remaining day is needed', () => {
    const p = getWeeklyGoalProgress(week('dmmmmmm', 6), 2);
    expect(p.daysLeft).toBe(1);
    expect(p.status).toBe('at-risk');
  });

  it('is out-of-reach when not enough days remain', () => {
    const p = getWeeklyGoalProgress(week('mmmmmuu', 5), 4);
    expect(p.status).toBe('out-of-reach');
  });

  it('does not count frozen days as trained', () => {
    const p = getWeeklyGoalProgress(week('dfdmuuu', 3), 3);
    expect(p.daysTrained).toBe(2);
  });

  it('starts the week on-track with nothing logged', () => {
    const p = getWeeklyGoalProgress(week('muuuuuu', 0), 4);
    expect(p.daysLeft).toBe(7);
    expect(p.status).toBe('on-track');
  });
});
