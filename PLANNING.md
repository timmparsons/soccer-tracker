# Master Touch — Future Ideas & Planning Notes

## Paywalls — Restore When Ready to Monetise

Both coach and player paywalls were removed to allow free sharing with the club while the user base grows. Here's what needs to go back in when the time comes.

### Coach Paywall

**What was removed:**
- `CoachPaywallScreen` component from `app/(onboarding)/index.tsx` — showed pricing ($19.99/mo), feature list, and RevenueCat purchase flow using the `'coach'` offering key
- `'coachpaywall'` step from `COACH_STEPS` in the same file
- Runtime gate in `app/(tabs)/coach.tsx` — checked `isCoach` from `useSubscription()` on mount and pushed to `/(modals)/paywall?tab=coach` if not subscribed
- `useSubscription` import and `paywallShownRef` / `useRef` in `coach.tsx`

**To restore:**
1. Add `CoachPaywallScreen` back to onboarding (was after `'coachsignup'` step) — hook into RevenueCat `Purchases.getOfferings()` using the `'coach'` offering, `monthly` package
2. Add `'coachpaywall'` back to `COACH_STEPS` as the last step, and change `coachsignup`'s `onNext` back to `goNext` (paywall handles `handleFinish`)
3. Re-add the gate in `CoachDashboard`: import `useSubscription`, check `isCoach`, push to `/(modals)/paywall` on mount if not subscribed
4. RevenueCat product to create: a `'coach'` offering with a `monthly` package at $19.99

### Player Paywall

**Current state:** Player pro features are still gated in `TrainPage`, `ProgressPage`, and `drill-library` via `useSubscription().isPremium`. The paywall modal itself (`app/(modals)/paywall.tsx`) is still in place and reachable.

**What's missing:** The player paywall was a step (`'paywall'`) in the old `PLAYER_STEPS` that was already dead/removed before this session — it was never wired up. To add a post-signup upsell for players, add a `PaywallScreen` step at the end of `PLAYER_STEPS` (after `'signup'`) using `Purchases.getOfferings()` with the annual/monthly player packages.

**RevenueCat entitlements to confirm:**
- `'pro'` — player premium (checked as `isPremium` in `useSubscription`)
- `'coach'` — coach access (checked as `isCoach`)

---

## Teams, Clubs & Leaderboard Structure

This documents how the three levels of organisation work today and what gaps exist.

### Three Levels

| Level | What it is | Leaderboard tab |
|---|---|---|
| **Team** | A squad managed by a coach. Players join via a 6-char code. | `team` tab — touches + juggling sub-tabs |
| **Club** | A parent organisation (e.g. a football club) that teams belong to. Players set their club during onboarding. | `club` tab — all players across all teams in the club |
| **Global** | Everyone on the app. Always visible regardless of team/club membership. | `global` tab |

The leaderboard (`components/Leaderboard/index.tsx`) defaults to the most specific view the user qualifies for: team → club → global. A player with no team and no club lands directly on the global tab.

---

### Team Creation

**Where it lives:** `app/(modals)/create-team.tsx`, surfaced via the "Create New Team" button in `components/CoachDashboard/ManageTab.tsx`

**Current flow:**
- Coach opens the Manage tab → taps "Create New Team" at the bottom
- Enters a team name; a random 6-char alphanumeric join code is generated and checked for uniqueness
- On create: inserts a row in `teams`, sets `profile.team_id` to the new team
- Players join via `app/(modals)/join-team.tsx` by entering the code
- Capped at 3 teams per coach (enforced in the UI; button locks and shows "Team Limit Reached")
- Each team card in ManageTab shows the code, copy/share buttons, player list, and season management

**This is fully working.**

---

### Club Creation

**Where it lives:** `components/ProfilePage/index.tsx` — `handleCreateClub` function, surfaced via a "Create Club" button in the club section of the profile page.

**Current flow:**
- User taps "Create Club" on their profile page → modal opens with a club name input
- On submit: inserts into `clubs` table, sets `profile.club_id` to the new club, and updates the club leaderboard query
- Players can also search for and join an existing club during onboarding (`ClubSearchScreen` step in player flow) via `hooks/useClubSearch.ts`

**This is fully working.**

---

### Global Leaderboard — Individual Players

**Current state:** Fully working. `hooks/useGlobalLeaderboard.ts` queries all players with `onboarding_completed = true` and `is_coach = false`, aggregates this week's touches from `daily_sessions`, and returns the top 100.

**Key behaviours:**
- Visible to everyone — no team or club required
- Names are anonymised via `utils/globalLeaderboardName.ts` / `utils/anonymousName.ts` (e.g. first name + last initial only)
- City/state shown if the player has set `hometown_city` / `hometown_state` on their profile (currently no UI to set this)
- Defaults to the global tab for players with no team and no club

**Gaps:**
- No way for players to set their hometown in the app — `hometown_city` / `hometown_state` fields exist on the `profiles` table but there's no UI. Adding a "Location (optional)" field to the profile page would populate the city/state shown on the global leaderboard.
- The global leaderboard only shows this week's touches — no all-time global view (club and team tabs have all-time options)

---

## Invite Code → Auto-Premium

When a user signs up and enters an invite code provided by their coach, automatically set `is_premium = true` on their profile.

**How it could work:**
- Coach generates a unique invite code (stored in a `team_invite_codes` table, linked to `team_id`)
- During onboarding (e.g. after the persona step), player enters the code
- On submit: validate code → insert player into team, set `is_premium = true` on their profile
- Bonus: auto-sets `team_id` on the profile so they join the right squad

**Why:** Removes friction — players on a coach's paid plan shouldn't have to subscribe separately. Coach pays, players get access automatically.

---

## Cleanup — Drop Legacy `daily_challenges` Tables

`daily_challenges` / `daily_challenge_completions` are from the old circuit-challenge system, replaced by `daily_sprints` and the home-card workout rotation. Nothing has written to them since Aug 2026 (0 completions ever), but the activity feed still reads them.

**Order matters — shipped builds query these tables:**
1. Remove the `daily_challenge_completions` query and realtime subscription from `hooks/useTeamActivity.ts` (~lines 288 and 809) and ship it
2. Wait until old builds have mostly aged out (or force-update)
3. Then `DROP TABLE daily_challenge_completions, daily_challenges;` and delete `supabase/daily_challenge_migration.sql`

**Why:** Dead schema plus a wasted feed query on every load.

---

## Player Profiles — Next Steps

The player profile screen (`app/player/[id].tsx`, opened from the leaderboard and Activity Feed) shipped Oct 2026. Full view (real name, team, session history) is shown to teammates, club-mates and the player's coach; everyone else gets a public view (first name + last initial, stats, heatmap, badges).

### Follow — Teammates & Club Only
Strava-style follow, but **never stranger discovery**. Much of the audience is kids.
- `follows` table (`follower_id`, `followee_id`, `created_at`), unique pair
- Follow button on the player profile, only when the viewer and player share a team or club
- "Following" filter on the Activity Feed
- If following ever opens up beyond team/club: request/approve, off by default for under-13 and family-managed accounts
- **Blocked on the RLS lockdown below** — follow is pointless as a privacy boundary while every session is readable

### Cheers on Profile Sessions
Feed cheers are keyed to per-day aggregate feed items, not individual `daily_sessions` rows, so profile session rows can't show or give cheers yet. Needs either a per-session cheer key or a mapping from session → feed item.

### Profile Polish
- Focus breakdown on the profile (e.g. "40% Ball Mastery") — reuse the Progress page focus query
- Personal bests section (best day, best week, juggle PB date)
- Tap your own avatar on Home → your own profile page, to see how teammates see you

---

## Security — Lock Down `daily_sessions` RLS

A SELECT policy `Authenticated users can view all daily sessions` (`qual = true`) makes the team and club policies on `daily_sessions` meaningless: any signed-in user can read every player's full session history. `profiles` is also readable by the `public` (unauthenticated) role. Deferred Oct 2026. **Must be done before follow ships or family/anon accounts merge** (anonymous users count as `authenticated`).

The profile screen's public view is a UI gate only — the data is still queryable.

**What depends on the open policy (and what replaces it):**
1. Home Activity Feed (`fetchActivityItems` in `hooks/useTeamActivity.ts`) is global with no team filter → scope to team + club
2. Global touches leaderboard (`fetchGlobalTouchesLeaderboard`) → security-definer RPC that returns names + weekly totals only
3. Admin all-teams screen (`useAllTeams`) → same RPC approach, or an `is_admin` policy
4. Coaches with multiple teams — current coach policies use the coach's own `profile.team_id` → add a policy on `teams.coach_id = auth.uid()`

Then drop the open policy, and replace the `public` profile policies with `authenticated` ones.
