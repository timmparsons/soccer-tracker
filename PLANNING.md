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
