# Testing Guide

## Running Tests

```bash
npm test           # run once
npm run test:watch # re-run on file save
```

## What's Tested

**Pure function unit tests** — these live in `__tests__/` and mirror the source layout:

| Test file | Source | What it covers |
|---|---|---|
| `__tests__/lib/xp.test.ts` | `lib/xp.ts` | Level calculation at all thresholds, rank names, rank badges |
| `__tests__/lib/checkBadges.test.ts` | `lib/checkBadges.ts` | All badge qualification logic: streaks, volume, sessions, perf, sky high, social, challenge streaks, drills |
| `__tests__/lib/vinnie.test.ts` | `lib/vinnie.ts` | All `getVinnieMood` branches: milestones, Monday, streak milestones, TPM, near-target, beginner, late-day urgency |
| `__tests__/lib/notifications.test.ts` | `lib/notifications.ts` | Reminder message copy for each day count |
| `__tests__/utils/formatTimeAgo.test.ts` | `utils/formatTimeAgo.ts` | Time bucket boundaries |
| `__tests__/utils/getDisplayName.test.ts` | `utils/getDisplayName.ts` | Name priority: display_name → first name → fallback |
| `__tests__/utils/getLocalDate.test.ts` | `utils/getLocalDate.ts` | Local date string formatting |
| `__tests__/utils/globalLeaderboardName.test.ts` | `utils/globalLeaderboardName.ts` | First name + last initial formatting |
| `__tests__/utils/anonymousName.test.ts` | `utils/anonymousName.ts` | Hash-based anonymous name stability |

## Adding New Tests

### Rule 1: Write the spec, not the current behavior

The test describes what *should* happen, not what the code currently does. If you run a test and it fails immediately after writing it, that means you caught a bug — that's the whole point.

Bad:
```ts
// copied the current (wrong) output and called it a test
expect(getLevelFromXp(300)).toEqual({ level: 1, ... });
```

Good:
```ts
// 300 XP is exactly the threshold for level 2 — it must promote
expect(getLevelFromXp(300)).toEqual({ level: 2, xpIntoLevel: 0, xpForNextLevel: 400 });
```

### Rule 2: One file per source file, same path

`utils/foo.ts` → `__tests__/utils/foo.test.ts`

### Rule 3: Only test pure functions here

Pure = no Supabase, no React Native, no hooks, no async. A function that takes inputs and returns an output with no side effects.

If you want to test something with Supabase calls, extract the pure decision logic first:

```ts
// before — untestable because it fetches from DB and decides
async function checkAndAwardBadges(userId, context) { ... }

// after — the decision is a pure function, testable without any DB
function qualifyingBadges(context, alreadyEarned: Set<string>): string[] { ... }
async function checkAndAwardBadges(userId, context) {
  const earned = await fetchEarned(userId);
  const toAward = qualifyingBadges(context, earned);
  await insertBadges(userId, toAward);
}
```

### Rule 4: Test boundary conditions

For numeric thresholds, always test: the value just below, exactly at, and just above.

```ts
expect(getLevelFromXp(299)).toMatchObject({ level: 1 }); // below
expect(getLevelFromXp(300)).toMatchObject({ level: 2 }); // at threshold
expect(getLevelFromXp(301)).toMatchObject({ level: 2 }); // above
```

### Rule 5: Mock time for time-dependent functions

```ts
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});
```

## Tech Stack

- **Jest 29** + **jest-expo preset** — handles Babel transforms and RN module mocking
- **`@/` alias** works in tests via `moduleNameMapper` in `package.json`

## What's Not Covered Yet

- **Badge qualification logic** (`lib/checkBadges.ts`) — currently mixed with Supabase I/O. Refactor `qualifyingBadges` out as a pure function, then test it.
- **Hooks** — need React Query wrappers + Supabase mocks. High setup cost.
- **Components/screens** — not worth the setup cost for render-doesn't-crash tests.
- **E2E flows** — Maestro is the right tool for "app is not broken end-to-end." See `docs/plans/` for future planning.
