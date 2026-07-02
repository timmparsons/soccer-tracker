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

## Invite Code → Auto-Premium

When a user signs up and enters an invite code provided by their coach, automatically set `is_premium = true` on their profile.

**How it could work:**
- Coach generates a unique invite code (stored in a `team_invite_codes` table, linked to `team_id`)
- During onboarding (e.g. after the persona step), player enters the code
- On submit: validate code → insert player into team, set `is_premium = true` on their profile
- Bonus: auto-sets `team_id` on the profile so they join the right squad

**Why:** Removes friction — players on a coach's paid plan shouldn't have to subscribe separately. Coach pays, players get access automatically.
