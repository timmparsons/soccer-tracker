// Activity feed headlines answer "what are my teammates doing?", not "who
// logged the biggest number?" — touches/duration sit in the stat chips, and
// raw totals only reach the headline for genuine lifetime milestones.

export type FeedBadgeTone = 'blue' | 'green';

export interface FeedBadge {
  label: string;
  tone: FeedBadgeTone;
  icon: 'checkmark' | 'stats-chart' | 'trophy' | 'flash';
}

export const LIFETIME_MILESTONES = [
  10000, 25000, 50000, 100000, 250000, 500000, 1000000,
];

const STREAK_HEADLINE_DAYS = new Set([3, 5, 7, 10, 14, 21, 30, 50, 75, 100]);

export const LONG_SESSION_MINUTES = 30;
export const SHORT_SESSION_MINUTES = 12;

export function pickForId<T>(arr: T[], id: string): T {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0x7fffffff;
  }
  return arr[hash % arr.length];
}

// Highest milestone crossed going from `before` to `after` lifetime touches.
export function milestoneCrossed(before: number, after: number): number | null {
  let crossed: number | null = null;
  for (const m of LIFETIME_MILESTONES) {
    if (before < m && after >= m) crossed = m;
  }
  return crossed;
}

export function isStreakHeadline(streak: number): boolean {
  return STREAK_HEADLINE_DAYS.has(streak) || (streak > 100 && streak % 50 === 0);
}

const FOCUS_PHRASES: Record<string, string[]> = {
  freestyle: ['worked on their freestyle', 'got some freestyle work in'],
  juggling: ['spent some time juggling', 'got some juggling work in'],
  dribbling: ['got some dribbling work in', 'worked on close control'],
  ball_mastery: ['sharpened their ball mastery', 'worked on their ball mastery'],
  passing: ['put some time into passing', 'worked on their passing'],
  first_touch: ['worked on their first touch', 'worked on receiving'],
  shooting: ['got some finishing work in', 'worked on their shooting'],
  fitness: ['put in some fitness work', 'worked on their fitness'],
};

const NORMAL_PHRASES = [
  'put in the work',
  'got some work in',
  'got after it',
  'put in a solid session',
  'got their touches in',
  'showed up today',
  'got better today',
  'got another session done',
  'got some time on the ball',
  'was back at it',
  'got to work',
  'kept working',
  'got a session in',
  'made today count',
  'found time to train',
  'spent some time on the ball',
  'knocked out a session',
  'got another one done',
  'is putting in the work',
];

const LONG_PHRASES = [
  'put in a big session',
  'had a serious session',
  'put in some extra work',
  'went to work today',
  'had a strong day',
  'put in a shift',
  'stayed on the ball',
  'went the extra mile',
  "wasn't messing around today",
  'came to work',
];

const SHORT_PHRASES = [
  'squeezed in a session',
  'got some quick work in',
  'made a few minutes count',
  'got on the ball today',
  'kept the habit going',
  'showed up, even on a busy day',
  'got a quick session done',
];

export interface SessionHeadlineInput {
  name: string;
  id: string;
  totalMinutes: number;
  sessionCount: number;
  focusArea: string | null;
  topDrill: { name: string; count: number } | null;
  streak: number;
  daysThisWeek: number;
  lifetimeMilestone: number | null;
}

export interface SessionHeadline {
  message: string;
  badge?: FeedBadge;
  isMilestone?: boolean;
}

// Drill names come from the `drills` table in title case, some with a
// parenthetical suffix (e.g. "Bell Taps (Foundations)") or a leading "The"
// (e.g. "The Hocus Pocus") — strip both and lowercase so the name reads
// naturally mid-sentence ("50 reps of bell taps").
export function cleanDrillName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/^the\s+/i, '')
    .toLowerCase()
    .trim();
}

// Priority: rare milestones, then consistency, then what they trained,
// then how long — raw touch totals never drive the headline.
export function sessionHeadline(input: SessionHeadlineInput): SessionHeadline {
  const { name, id, totalMinutes, sessionCount, focusArea, topDrill, streak, daysThisWeek } = input;

  if (input.lifetimeMilestone) {
    const x = input.lifetimeMilestone.toLocaleString();
    return {
      message: pickForId(
        [
          `${name} just crossed ${x} lifetime touches`,
          `${name} joined the ${x} club`,
          `${name} just hit ${x} lifetime touches`,
        ],
        id,
      ),
      badge: { label: `${x} Touches`, tone: 'blue', icon: 'trophy' },
      isMilestone: true,
    };
  }

  if (isStreakHeadline(streak)) {
    return {
      message: pickForId(
        [
          `${name} kept the streak alive`,
          `${name} made it ${streak} days straight`,
          `${name} has trained ${streak} days in a row`,
          `${name} keeps stacking days`,
          `${name} is on a roll`,
        ],
        id,
      ),
    };
  }

  // Weekly consistency on roughly half of eligible days so it doesn't
  // crowd out what they actually worked on.
  if (daysThisWeek >= 3 && pickForId([true, false], `${id}-week`)) {
    return {
      message: pickForId(
        [
          `${name} has trained ${daysThisWeek} days this week`,
          `${name} is putting together a strong week`,
          `${name} checked off another training day`,
          `${name} keeps showing up`,
        ],
        id,
      ),
    };
  }

  if (focusArea && FOCUS_PHRASES[focusArea]) {
    return { message: `${name} ${pickForId(FOCUS_PHRASES[focusArea], id)}` };
  }

  if (topDrill) {
    const drillName = cleanDrillName(topDrill.name);
    return {
      message: pickForId(
        [
          `${name} banged out ${topDrill.count} reps of ${drillName}`,
          `${name} put in ${topDrill.count} reps of ${drillName}`,
          `${name} knocked out ${topDrill.count} reps of ${drillName}`,
        ],
        id,
      ),
    };
  }

  if (sessionCount >= 3) {
    return {
      message: pickForId(
        [`${name} kept coming back: ${sessionCount} sessions`, `${name} got ${sessionCount} sessions in`],
        id,
      ),
    };
  }

  if (totalMinutes >= LONG_SESSION_MINUTES) {
    return { message: `${name} ${pickForId(LONG_PHRASES, id)}` };
  }

  if (totalMinutes > 0 && totalMinutes <= SHORT_SESSION_MINUTES) {
    const phrases =
      totalMinutes >= 5 ? [`found ${totalMinutes} minutes to get better`, ...SHORT_PHRASES] : SHORT_PHRASES;
    return { message: `${name} ${pickForId(phrases, id)}` };
  }

  return { message: `${name} ${pickForId(NORMAL_PHRASES, id)}` };
}
