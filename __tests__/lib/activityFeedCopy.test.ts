import {
  isStreakHeadline,
  milestoneCrossed,
  sessionHeadline,
  SessionHeadlineInput,
} from '@/lib/activityFeedCopy';

const base: SessionHeadlineInput = {
  name: 'Myles',
  id: 'session-abc-2026-11-01T10:00:00Z',
  totalMinutes: 20,
  sessionCount: 1,
  focusArea: null,
  topDrill: null,
  streak: 0,
  daysThisWeek: 0,
  lifetimeMilestone: null,
};

describe('milestoneCrossed', () => {
  it('returns the milestone crossed by the day', () => {
    expect(milestoneCrossed(9500, 10200)).toBe(10000);
  });

  it('returns the highest when several are crossed at once', () => {
    expect(milestoneCrossed(9000, 26000)).toBe(25000);
  });

  it('returns null when none is crossed', () => {
    expect(milestoneCrossed(10000, 12000)).toBeNull();
  });
});

describe('isStreakHeadline', () => {
  it('only fires on notable streak lengths', () => {
    expect(isStreakHeadline(5)).toBe(true);
    expect(isStreakHeadline(6)).toBe(false);
    expect(isStreakHeadline(150)).toBe(true);
    expect(isStreakHeadline(237)).toBe(false);
  });
});

describe('sessionHeadline', () => {
  it('never puts the daily touch total in the headline', () => {
    const { message } = sessionHeadline({ ...base, totalMinutes: 60 });
    expect(message).not.toMatch(/\d,\d{3}/);
  });

  it('leads with a lifetime milestone', () => {
    const result = sessionHeadline({ ...base, streak: 5, lifetimeMilestone: 100000 });
    expect(result.isMilestone).toBe(true);
    expect(result.badge?.label).toBe('100,000 Touches');
  });

  it('celebrates notable streaks without a streak badge', () => {
    const result = sessionHeadline({ ...base, streak: 7 });
    expect(result.message).toMatch(/streak|days|roll/);
    expect(result.badge).toBeUndefined();
  });

  it('describes the training focus', () => {
    const { message } = sessionHeadline({ ...base, focusArea: 'first_touch' });
    expect(message).toMatch(/^Myles worked on (their first touch|receiving)$/);
  });

  it('never shows a long streak to others', () => {
    const result = sessionHeadline({ ...base, streak: 237, focusArea: 'passing' });
    expect(result.message).not.toMatch(/237/);
    expect(result.badge).toBeUndefined();
  });

  it('never says "1 minutes" for very short sessions', () => {
    const { message } = sessionHeadline({ ...base, totalMinutes: 1 });
    expect(message).not.toMatch(/minutes/);
  });
});
