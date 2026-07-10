import {
  getVinnieMood,
  VinnieContext,
  VINNIE_STREAK_MESSAGES,
  VINNIE_CHALLENGE_STREAK_MESSAGES,
  VINNIE_STREAK_MILESTONES,
  VINNIE_CHALLENGE_STREAK_MILESTONES,
} from '@/lib/vinnie';

// Baseline context — trained today, no special conditions.
// totalTouches must not be in MILESTONE_MESSAGES keys [1000,5000,10000,25000,50000,100000]
// or it will trigger the highest-priority hype branch before anything else.
const BASE: VinnieContext = {
  trainedToday: true,
  streak: 5,
  hour: 14,
  dayOfWeek: 3,
  challengeStreak: 0,
  skillFocus: null,
  todayTouches: 500,
  dailyTarget: 1000,
  weekTpm: 0,
  weekSessions: 3,
  totalTouches: 2500,
};

function ctx(overrides: Partial<VinnieContext>): VinnieContext {
  return { ...BASE, ...overrides };
}

beforeEach(() => {
  // Return a value that skips all random-gated branches by default:
  // 0.5 >= 0.4 (skips TPM branch) and 0.5 >= 0.25 (skips skill tip branch)
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// TOUCH MILESTONES — highest priority
describe('touch milestones', () => {
  it.each([1000, 5000, 10000, 25000, 50000, 100000])(
    'totalTouches === %i → hype mood',
    (totalTouches) => {
      const result = getVinnieMood(ctx({ totalTouches }));
      expect(result.mood).toBe('hype');
      expect(result.message.length).toBeGreaterThan(0);
    },
  );

  it('milestone takes priority even when not trained today', () => {
    const result = getVinnieMood(ctx({ totalTouches: 10000, trainedToday: false }));
    expect(result.mood).toBe('hype');
  });
});

// MONDAY MORNING
describe('Monday morning (not trained, before noon)', () => {
  it('returns encouraging mood on Monday morning', () => {
    const result = getVinnieMood(ctx({ trainedToday: false, dayOfWeek: 1, hour: 9 }));
    expect(result.mood).toBe('encouraging');
  });

  it('does not trigger Monday message at noon', () => {
    const result = getVinnieMood(ctx({ trainedToday: false, dayOfWeek: 1, hour: 12, streak: 0, weekSessions: 5 }));
    expect(result.mood).not.toBe('encouraging'); // falls to streak=0 → firm
  });

  it('does not trigger Monday message when already trained', () => {
    const result = getVinnieMood(ctx({ trainedToday: true, dayOfWeek: 1, hour: 9, challengeStreak: 0 }));
    // trained today with no milestones → happy (after random skips)
    expect(result.mood).toBe('happy');
  });
});

// TRAINED TODAY — streak milestones
describe('trained today + challenge streak milestones', () => {
  it.each(VINNIE_CHALLENGE_STREAK_MILESTONES)(
    'challengeStreak === %i → hype with correct message',
    (challengeStreak) => {
      const result = getVinnieMood(ctx({ challengeStreak }));
      expect(result.mood).toBe('hype');
      expect(result.message).toBe(VINNIE_CHALLENGE_STREAK_MESSAGES[challengeStreak]);
    },
  );
});

describe('trained today + training streak milestones', () => {
  it.each(VINNIE_STREAK_MILESTONES)(
    'streak === %i → hype with correct message',
    (streak) => {
      const result = getVinnieMood(ctx({ streak, challengeStreak: 0 }));
      expect(result.mood).toBe('hype');
      expect(result.message).toBe(VINNIE_STREAK_MESSAGES[streak]);
    },
  );
});

// TRAINED TODAY — TPM feedback (requires Math.random < 0.4)
describe('trained today + TPM feedback', () => {
  beforeEach(() => {
    jest.spyOn(Math, 'random').mockReturnValue(0.3); // fires the 0.4 gate
  });

  it('weekTpm >= 80 → hype', () => {
    const result = getVinnieMood(ctx({ weekTpm: 80, challengeStreak: 0 }));
    expect(result.mood).toBe('hype');
  });

  it('weekTpm >= 50 and < 80 → happy', () => {
    const result = getVinnieMood(ctx({ weekTpm: 60, challengeStreak: 0 }));
    expect(result.mood).toBe('happy');
  });

  it('weekTpm < 30 → firm', () => {
    const result = getVinnieMood(ctx({ weekTpm: 20, challengeStreak: 0 }));
    expect(result.mood).toBe('firm');
  });

  it('weekTpm === 0 does not trigger TPM branch', () => {
    const result = getVinnieMood(ctx({ weekTpm: 0, challengeStreak: 0 }));
    // With Math.random = 0.3, skips skill-tip (0.3 >= 0.25? no — 0.3 >= 0.25 is true, so it DOES trigger skill tip)
    // Actually 0.3 < 0.4 (weekTpm gate) but weekTpm = 0 so branch is skipped entirely.
    // 0.3 < 0.25 is false, so skill tip is skipped.
    // Falls to happy.
    expect(result.mood).toBe('happy');
  });
});

// TRAINED TODAY — near daily target
describe('trained today + near daily target', () => {
  it('75% progress → encouraging', () => {
    const result = getVinnieMood(ctx({ todayTouches: 750, dailyTarget: 1000, weekTpm: 0, challengeStreak: 0, totalTouches: 2500 }));
    expect(result.mood).toBe('encouraging');
  });

  it('exactly 75% → encouraging', () => {
    const result = getVinnieMood(ctx({ todayTouches: 75, dailyTarget: 100, weekTpm: 0, challengeStreak: 0, totalTouches: 2500 }));
    expect(result.mood).toBe('encouraging');
  });

  it('100% (target hit) does not trigger near-target', () => {
    const result = getVinnieMood(ctx({ todayTouches: 1000, dailyTarget: 1000, weekTpm: 0, challengeStreak: 0, totalTouches: 2500 }));
    // pct = 1.0, not < 1.0, so falls through
    expect(result.mood).toBe('happy');
  });

  it('74% does not trigger near-target', () => {
    const result = getVinnieMood(ctx({ todayTouches: 74, dailyTarget: 100, weekTpm: 0, challengeStreak: 0, totalTouches: 2500 }));
    expect(result.mood).toBe('happy');
  });
});

// TRAINED TODAY — beginner
describe('trained today + beginner (<1000 total touches)', () => {
  it('returns encouraging for players under 1000 total touches', () => {
    const result = getVinnieMood(ctx({
      totalTouches: 500,
      todayTouches: 100,
      dailyTarget: 1000,
      weekTpm: 0,
      challengeStreak: 0,
    }));
    expect(result.mood).toBe('encouraging');
  });

  it('exactly 999 touches → encouraging', () => {
    const result = getVinnieMood(ctx({
      totalTouches: 999,
      todayTouches: 100,
      dailyTarget: 1000,
      weekTpm: 0,
      challengeStreak: 0,
    }));
    expect(result.mood).toBe('encouraging');
  });

  it('exactly 1000 touches does not trigger beginner branch', () => {
    // 1000 is a milestone → hype (tested above separately)
    // Use 1001 to test the fallthrough
    const result = getVinnieMood(ctx({
      totalTouches: 1001,
      todayTouches: 100,
      dailyTarget: 1000,
      weekTpm: 0,
      challengeStreak: 0,
    }));
    expect(result.mood).toBe('happy');
  });
});

// TRAINED TODAY — default happy
describe('trained today + default', () => {
  it('returns happy when no special conditions match', () => {
    const result = getVinnieMood(ctx({
      challengeStreak: 0,
      weekTpm: 0,
      todayTouches: 400, // < 75% of 1000
      totalTouches: 2500,
    }));
    expect(result.mood).toBe('happy');
  });

  it('message is a non-empty string', () => {
    const result = getVinnieMood(ctx({ challengeStreak: 0, weekTpm: 0, todayTouches: 400, totalTouches: 2500 }));
    expect(typeof result.message).toBe('string');
    expect(result.message.length).toBeGreaterThan(0);
  });
});

// NOT TRAINED — various conditions
describe('not trained + mid-week with low sessions', () => {
  it('Wed/Thu/Fri with < 2 sessions → firm', () => {
    [3, 4, 5].forEach((dayOfWeek) => {
      const result = getVinnieMood(ctx({ trainedToday: false, dayOfWeek, weekSessions: 1, streak: 0, hour: 14 }));
      expect(result.mood).toBe('firm');
    });
  });

  it('Mon/Tue does not trigger low-session branch', () => {
    const result = getVinnieMood(ctx({ trainedToday: false, dayOfWeek: 2, weekSessions: 0, streak: 0, hour: 14 }));
    // dayOfWeek 2 < 3, skips to streak=0 → firm anyway, but for different reason
    expect(result.mood).toBe('firm');
  });

  it('mid-week with 2+ sessions does not trigger low-session branch', () => {
    const result = getVinnieMood(ctx({ trainedToday: false, dayOfWeek: 3, weekSessions: 2, streak: 3, hour: 14 }));
    expect(result.mood).toBe('encouraging');
  });
});

describe('not trained + streak at risk late (hour >= 20)', () => {
  it('streak > 3 and hour >= 20 → anxious with streak count in message', () => {
    const result = getVinnieMood(ctx({ trainedToday: false, streak: 10, hour: 20, weekSessions: 5, dayOfWeek: 5 }));
    expect(result.mood).toBe('anxious');
    expect(result.message).toContain('10');
  });

  it('streak === 3 (not > 3) does not trigger anxious', () => {
    const result = getVinnieMood(ctx({ trainedToday: false, streak: 3, hour: 20, weekSessions: 5, dayOfWeek: 5 }));
    expect(result.mood).toBe('urgent'); // falls to hour >= 19 → urgent
  });
});

describe('not trained + late (hour >= 19)', () => {
  it('hour 19 → urgent', () => {
    const result = getVinnieMood(ctx({ trainedToday: false, streak: 2, hour: 19, weekSessions: 5, dayOfWeek: 5 }));
    expect(result.mood).toBe('urgent');
  });

  it('hour 23 → urgent', () => {
    const result = getVinnieMood(ctx({ trainedToday: false, streak: 2, hour: 23, weekSessions: 5, dayOfWeek: 5 }));
    expect(result.mood).toBe('urgent');
  });

  it('hour 18 does not trigger urgent', () => {
    const result = getVinnieMood(ctx({ trainedToday: false, streak: 0, hour: 18, weekSessions: 5, dayOfWeek: 5 }));
    expect(result.mood).toBe('firm'); // streak 0 → firm
  });
});

describe('not trained + zero streak', () => {
  it('streak 0 at a normal hour → firm', () => {
    const result = getVinnieMood(ctx({ trainedToday: false, streak: 0, hour: 14, weekSessions: 5, dayOfWeek: 5 }));
    expect(result.mood).toBe('firm');
  });
});

describe('not trained + default fallthrough', () => {
  it('returning player with a streak at a reasonable hour → encouraging', () => {
    const result = getVinnieMood(ctx({ trainedToday: false, streak: 3, hour: 14, weekSessions: 5, dayOfWeek: 2 }));
    expect(result.mood).toBe('encouraging');
  });
});

// ALWAYS RETURNS VALID SHAPE
describe('always returns valid shape', () => {
  const scenarios: [string, VinnieContext][] = [
    ['minimal trained', { trainedToday: true, streak: 0, hour: 10 }],
    ['minimal not trained', { trainedToday: false, streak: 0, hour: 10 }],
    ['streak risk', { trainedToday: false, streak: 10, hour: 21 }],
  ];

  it.each(scenarios)('%s', (_, context) => {
    const result = getVinnieMood(context);
    expect(typeof result.mood).toBe('string');
    expect(typeof result.message).toBe('string');
    expect(result.message.length).toBeGreaterThan(0);
  });
});
