# Plan: Coach Dashboard Sync + View Toggle + Chart Date Bug Fix

> ✅ **IMPLEMENTED** — March 2026

## Context
Three things addressed:
1. **Coach dashboard** — show juggling records, fix N+1 query performance, auto-refresh so coaches see live player data without manual pull-to-refresh.
2. **Coach/Player view toggle** — coaches with children need to switch between their coach dashboard and the full player experience (Train, Progress, Leaderboard tabs).
3. **Progress chart shows wrong day at night** — two root causes: (a) the chart React Query key doesn't include the current date, so cached data persists past midnight; (b) `new Date("YYYY-MM-DD")` parses as UTC midnight, causing negative `daysDiff` in streak calculations for users in UTC+ timezones.

---

## Fix 1: Progress Chart Wrong Day Bug

### Root Cause A — Stale query key
`['chart-stats', user?.id, timeFilter]` never changes when the date changes.

**Fix:** Add `getLocalDate()` to the query key so midnight automatically invalidates the cache.

### Root Cause B — UTC midnight parsing in streak calculation
`new Date("2026-03-13")` is UTC midnight, not local midnight.

**Fix:** `new Date(dateStr + 'T00:00:00')` forces local midnight interpretation.

### Files
- `components/ProgressPage/index.tsx` — add `getLocalDate()` to `queryKey`
- `hooks/useTouchTracking.ts` — fix `new Date(dateStr)` in `useTouchTracking` and `useChallengeStats` streak loops
- `app/(tabs)/coach.tsx` — same streak fix

---

## Fix 2: Coach Dashboard — Performance + Juggling Stats + Auto-Refresh

### Performance (N+1 → batch queries)
Replaced per-player queries with two team-wide batch queries:
1. `.in('user_id', playerIds)` for all sessions
2. `.in('user_id', playerIds)` for all targets

Reduces from ~2N to 4 total queries regardless of team size.

### Juggling Records
Added `best_juggle: number` to `PlayerStats`. Computed from `juggle_count` on sessions. Shown on player cards in orange when > 0.

### Auto-Refresh
Added `refetchInterval: 30_000` to the `['coach-team-players']` query.

### File
- `app/(tabs)/coach.tsx`

---

## Fix 3: Coach/Player View Toggle

`ViewModeContext` defined and exported from `app/(tabs)/_layout.tsx`, persisted to AsyncStorage under key `'viewMode'`.

| `is_coach` | `viewMode` | Tabs shown | Home renders |
|---|---|---|---|
| `false` | — | Home, Progress, Train, Leaderboard, Profile | `HomeScreen` |
| `true` | `'coach'` | Home (Team), Leaderboard, Profile | `CoachDashboard` |
| `true` | `'player'` | Home, Progress, Train, Leaderboard, Profile | `HomeScreen` |

Toggle UI:
- Coach Dashboard header: pill button → "👤 Player View"
- Profile tab: "Current View" settings row with tap-to-switch for coaches

### Files
- `app/(tabs)/_layout.tsx` — `ViewModeContext`, AsyncStorage load/save, tab `href` control
- `app/(tabs)/index.tsx` — consume `ViewModeContext`
- `app/(tabs)/coach.tsx` — "Player View" pill button
- `components/ProfilePage/index.tsx` — view toggle settings row

---

## Fix 4: Leaderboard Default to Daily

Changed default `touchesPeriod` from `'week'` to `'today'`.

### File
- `components/Leaderboard/index.tsx`
