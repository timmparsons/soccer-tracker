// Mock supabase to prevent AsyncStorage native module initialisation.
// qualifyingBadges is a pure function and never touches supabase at runtime.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

import { qualifyingBadges, BadgeCheckContext, BadgeQueryData } from '@/lib/checkBadges';

const BASE_CONTEXT: BadgeCheckContext = {
  totalSessions: 1,
  totalTouches: 0,
  currentStreak: 0,
  jugglesThisSession: null,
  previousJugglePB: 0,
  durationMinutes: null,
  sessionsThisWeek: 0,
  teamId: null,
};

const NO_BADGES: BadgeQueryData = { alreadyEarned: new Set() };

function ctx(overrides: Partial<BadgeCheckContext>): BadgeCheckContext {
  return { ...BASE_CONTEXT, ...overrides };
}

function data(overrides: Partial<BadgeQueryData>): BadgeQueryData {
  return { ...NO_BADGES, ...overrides };
}

// STREAK BADGES
describe('streak badges', () => {
  it('awards streak_3 at exactly 3 days', () => {
    expect(qualifyingBadges(ctx({ currentStreak: 3 }), NO_BADGES)).toContain('streak_3');
  });

  it('does not award streak_3 at 2 days', () => {
    expect(qualifyingBadges(ctx({ currentStreak: 2 }), NO_BADGES)).not.toContain('streak_3');
  });

  it('awards all streak badges at 365', () => {
    const badges = qualifyingBadges(ctx({ currentStreak: 365 }), NO_BADGES);
    expect(badges).toContain('streak_3');
    expect(badges).toContain('streak_7');
    expect(badges).toContain('streak_30');
    expect(badges).toContain('streak_100');
    expect(badges).toContain('streak_365');
  });

  it('skips already-earned streak badges', () => {
    const earned = new Set(['streak_3', 'streak_7']);
    const badges = qualifyingBadges(ctx({ currentStreak: 30 }), data({ alreadyEarned: earned }));
    expect(badges).not.toContain('streak_3');
    expect(badges).not.toContain('streak_7');
    expect(badges).toContain('streak_30');
  });
});

// VOLUME BADGES
describe('volume badges', () => {
  it('awards volume_1k at exactly 1000 touches', () => {
    expect(qualifyingBadges(ctx({ totalTouches: 1_000 }), NO_BADGES)).toContain('volume_1k');
  });

  it('does not award volume_1k at 999 touches', () => {
    expect(qualifyingBadges(ctx({ totalTouches: 999 }), NO_BADGES)).not.toContain('volume_1k');
  });

  it('awards all volume badges at 1M touches', () => {
    const badges = qualifyingBadges(ctx({ totalTouches: 1_000_000 }), NO_BADGES);
    ['volume_1k', 'volume_10k', 'volume_50k', 'volume_100k', 'volume_500k', 'volume_1m'].forEach(
      (id) => expect(badges).toContain(id),
    );
  });
});

// SESSION BADGES
describe('session badges', () => {
  it('awards sessions_first on first session', () => {
    expect(qualifyingBadges(ctx({ totalSessions: 1 }), NO_BADGES)).toContain('sessions_first');
  });

  it('awards sessions_week5 at 5 sessions this week', () => {
    expect(qualifyingBadges(ctx({ sessionsThisWeek: 5 }), NO_BADGES)).toContain('sessions_week5');
  });

  it('does not award sessions_week5 at 4', () => {
    expect(qualifyingBadges(ctx({ sessionsThisWeek: 4 }), NO_BADGES)).not.toContain('sessions_week5');
  });
});

// PERFORMANCE BADGES
describe('performance badges', () => {
  it('awards perf_pb when juggle count beats previous PB', () => {
    const badges = qualifyingBadges(
      ctx({ jugglesThisSession: 50, previousJugglePB: 49 }),
      NO_BADGES,
    );
    expect(badges).toContain('perf_pb');
  });

  it('does not award perf_pb when juggle count equals previous PB', () => {
    const badges = qualifyingBadges(
      ctx({ jugglesThisSession: 50, previousJugglePB: 50 }),
      NO_BADGES,
    );
    expect(badges).not.toContain('perf_pb');
  });

  it('does not award perf_pb when jugglesThisSession is null', () => {
    const badges = qualifyingBadges(
      ctx({ jugglesThisSession: null, previousJugglePB: 0 }),
      NO_BADGES,
    );
    expect(badges).not.toContain('perf_pb');
  });

  it('awards perf_30min at exactly 30 minutes', () => {
    expect(qualifyingBadges(ctx({ durationMinutes: 30 }), NO_BADGES)).toContain('perf_30min');
  });

  it('does not award perf_30min at 29 minutes', () => {
    expect(qualifyingBadges(ctx({ durationMinutes: 29 }), NO_BADGES)).not.toContain('perf_30min');
  });
});

// SKY HIGH BADGES
describe('sky high badges', () => {
  it('does not award sky high when juggleSessions is not provided', () => {
    const badges = qualifyingBadges(BASE_CONTEXT, NO_BADGES);
    expect(badges).not.toContain('perf_sky_high_bronze');
  });

  it('awards bronze after 3 consecutive days of PBs at 20+', () => {
    const sessions = [
      { date: '2024-01-01', juggle_count: 10 },
      { date: '2024-01-02', juggle_count: 15 },
      { date: '2024-01-03', juggle_count: 20 },
    ];
    const badges = qualifyingBadges(BASE_CONTEXT, data({ juggleSessions: sessions }));
    expect(badges).toContain('perf_sky_high_bronze');
    expect(badges).not.toContain('perf_sky_high_silver');
    expect(badges).not.toContain('perf_sky_high_gold');
  });

  it('awards silver after 3 consecutive days of PBs ending at 50+', () => {
    const sessions = [
      { date: '2024-01-01', juggle_count: 30 },
      { date: '2024-01-02', juggle_count: 40 },
      { date: '2024-01-03', juggle_count: 50 },
    ];
    const badges = qualifyingBadges(BASE_CONTEXT, data({ juggleSessions: sessions }));
    expect(badges).toContain('perf_sky_high_bronze');
    expect(badges).toContain('perf_sky_high_silver');
    expect(badges).not.toContain('perf_sky_high_gold');
  });

  it('awards gold after 3 consecutive days of PBs ending at 100+', () => {
    const sessions = [
      { date: '2024-01-01', juggle_count: 70 },
      { date: '2024-01-02', juggle_count: 80 },
      { date: '2024-01-03', juggle_count: 100 },
    ];
    const badges = qualifyingBadges(BASE_CONTEXT, data({ juggleSessions: sessions }));
    expect(badges).toContain('perf_sky_high_gold');
  });

  it('does not award sky high with a gap in the streak', () => {
    const sessions = [
      { date: '2024-01-01', juggle_count: 10 },
      { date: '2024-01-02', juggle_count: 15 },
      // gap — 03 missing
      { date: '2024-01-04', juggle_count: 25 },
    ];
    const badges = qualifyingBadges(BASE_CONTEXT, data({ juggleSessions: sessions }));
    expect(badges).not.toContain('perf_sky_high_bronze');
  });

  it('requires a new PB each day (same count does not continue the streak)', () => {
    const sessions = [
      { date: '2024-01-01', juggle_count: 20 },
      { date: '2024-01-02', juggle_count: 20 }, // not a PB
      { date: '2024-01-03', juggle_count: 21 },
    ];
    const badges = qualifyingBadges(BASE_CONTEXT, data({ juggleSessions: sessions }));
    expect(badges).not.toContain('perf_sky_high_bronze');
  });

  it('uses the best juggle count per day when multiple sessions exist', () => {
    // day 2 has a lower session first but a higher one second — should use 15
    const sessions = [
      { date: '2024-01-01', juggle_count: 10 },
      { date: '2024-01-02', juggle_count: 5 },
      { date: '2024-01-02', juggle_count: 15 },
      { date: '2024-01-03', juggle_count: 20 },
    ];
    const badges = qualifyingBadges(BASE_CONTEXT, data({ juggleSessions: sessions }));
    expect(badges).toContain('perf_sky_high_bronze');
  });

  it('skips already-earned sky high badges', () => {
    const sessions = [
      { date: '2024-01-01', juggle_count: 70 },
      { date: '2024-01-02', juggle_count: 80 },
      { date: '2024-01-03', juggle_count: 100 },
    ];
    const earned = new Set(['perf_sky_high_bronze', 'perf_sky_high_silver', 'perf_sky_high_gold']);
    const badges = qualifyingBadges(BASE_CONTEXT, data({ alreadyEarned: earned, juggleSessions: sessions }));
    expect(badges).not.toContain('perf_sky_high_bronze');
    expect(badges).not.toContain('perf_sky_high_gold');
  });
});

// SOCIAL BADGES
describe('social badges', () => {
  it('awards social_team when teamId is set', () => {
    expect(qualifyingBadges(ctx({ teamId: 'team-123' }), NO_BADGES)).toContain('social_team');
  });

  it('does not award social_team when teamId is null', () => {
    expect(qualifyingBadges(ctx({ teamId: null }), NO_BADGES)).not.toContain('social_team');
  });
});

// CHALLENGE TIER UNLOCK BADGES
describe('challenge tier unlock badges', () => {
  it('awards challenge_intermediate at 10k touches', () => {
    expect(qualifyingBadges(ctx({ totalTouches: 10_000 }), NO_BADGES)).toContain('challenge_intermediate');
  });

  it('awards challenge_advanced at 50k touches', () => {
    expect(qualifyingBadges(ctx({ totalTouches: 50_000 }), NO_BADGES)).toContain('challenge_advanced');
  });
});

// CHALLENGE STREAK BADGES
describe('challenge streak badges', () => {
  const TODAY = new Date('2024-06-15T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(TODAY);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function daysBackFromToday(n: number): string {
    const d = new Date(TODAY);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }

  it('does not check challenge streaks when challengeSessions is not provided', () => {
    const badges = qualifyingBadges(BASE_CONTEXT, NO_BADGES);
    expect(badges).not.toContain('challenge_streak_3');
  });

  it('awards challenge_streak_3 for 3 consecutive days ending today', () => {
    const sessions = [
      { date: daysBackFromToday(0) },
      { date: daysBackFromToday(1) },
      { date: daysBackFromToday(2) },
    ];
    const badges = qualifyingBadges(BASE_CONTEXT, data({ challengeSessions: sessions }));
    expect(badges).toContain('challenge_streak_3');
  });

  it('does not award challenge_streak_3 when there is a gap', () => {
    const sessions = [
      { date: daysBackFromToday(0) },
      // gap: 1 day back missing
      { date: daysBackFromToday(2) },
      { date: daysBackFromToday(3) },
    ];
    const badges = qualifyingBadges(BASE_CONTEXT, data({ challengeSessions: sessions }));
    expect(badges).not.toContain('challenge_streak_3');
  });

  it('does not award challenge_streak_3 when streak does not include today', () => {
    const sessions = [
      { date: daysBackFromToday(1) },
      { date: daysBackFromToday(2) },
      { date: daysBackFromToday(3) },
    ];
    const badges = qualifyingBadges(BASE_CONTEXT, data({ challengeSessions: sessions }));
    expect(badges).not.toContain('challenge_streak_3');
  });

  it('awards challenge_streak_7 for 7 consecutive days', () => {
    const sessions = Array.from({ length: 7 }, (_, i) => ({ date: daysBackFromToday(i) }));
    const badges = qualifyingBadges(BASE_CONTEXT, data({ challengeSessions: sessions }));
    expect(badges).toContain('challenge_streak_7');
  });
});

// DRILLS BADGES
describe('drills_beginner badge', () => {
  it('does not award drills_beginner when drill data is not provided', () => {
    const badges = qualifyingBadges(BASE_CONTEXT, NO_BADGES);
    expect(badges).not.toContain('drills_beginner');
  });

  it('awards drills_beginner when all beginner drill IDs are completed', () => {
    const badges = qualifyingBadges(
      BASE_CONTEXT,
      data({
        beginnerDrillIds: ['drill-1', 'drill-2', 'drill-3'],
        completedDrillIds: ['drill-1', 'drill-2', 'drill-3', 'drill-4'],
      }),
    );
    expect(badges).toContain('drills_beginner');
  });

  it('does not award drills_beginner when some beginner drills are missing', () => {
    const badges = qualifyingBadges(
      BASE_CONTEXT,
      data({
        beginnerDrillIds: ['drill-1', 'drill-2', 'drill-3'],
        completedDrillIds: ['drill-1', 'drill-2'],
      }),
    );
    expect(badges).not.toContain('drills_beginner');
  });

  it('does not award drills_beginner when beginnerDrillIds is empty', () => {
    const badges = qualifyingBadges(
      BASE_CONTEXT,
      data({ beginnerDrillIds: [], completedDrillIds: ['drill-1'] }),
    );
    expect(badges).not.toContain('drills_beginner');
  });

  it('skips drills_beginner check when already earned', () => {
    const earned = new Set(['drills_beginner']);
    const badges = qualifyingBadges(
      BASE_CONTEXT,
      data({
        alreadyEarned: earned,
        beginnerDrillIds: ['drill-1'],
        completedDrillIds: ['drill-1'],
      }),
    );
    expect(badges).not.toContain('drills_beginner');
  });
});

// GENERAL BEHAVIOUR
describe('general behaviour', () => {
  it('returns empty array when nothing qualifies', () => {
    const nothing: BadgeCheckContext = { ...BASE_CONTEXT, totalSessions: 0 };
    expect(qualifyingBadges(nothing, NO_BADGES)).toEqual([]);
  });

  it('never returns duplicate badge IDs', () => {
    const badges = qualifyingBadges(
      ctx({ currentStreak: 365, totalTouches: 1_000_000, totalSessions: 100 }),
      NO_BADGES,
    );
    expect(badges.length).toBe(new Set(badges).size);
  });
});
