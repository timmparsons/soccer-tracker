# Plan: MasterTouch Pro — Subscription Model

## Overview

Two subscription tiers:

**MasterTouch Pro** (individual players)
- Monthly: $4.99 (7-day free trial)
- Annual: $34.99 (pre-selected, saves 42%)

**MasterTouch Coach** (coaches — covers entire squad)
- Monthly: $19.99 (no free trial)

**Stack:** RevenueCat (`react-native-purchases`) wrapping the App Store. iOS only for now (Google Play on hold).

---

## Future Tier: Family Plan (not yet planned)

Once Pro and Coach are validated, consider a **Family plan** (~$7.99/mo) covering 2–3 kids under one parent account. Reasons to revisit:
- Some kids train solo without a formal team and have no coach to unlock Pro for them
- Parents are the actual payer — a per-family price is an easier sell than per-child
- Proven upsell pattern once you have parents already on the platform

Hold off until there's real user feedback on pricing. Don't add pricing complexity before the first two tiers are live.

---

## Feature Access by Tier

| Feature | Free | Pro | Coach (team members) | Coach (self) |
|---------|------|-----|----------------------|--------------|
| Chart view | 7-day only | 7-day + monthly | 7-day + monthly | 7-day + monthly |
| Session history | Last 3 sessions | Full history | Full history | Full history |
| Achievements | First 3 unlocked | All achievements | All achievements | All achievements |
| Timer presets | 1 min + 5 min only | Custom input | Custom input | Custom input |
| Daily challenges | ❌ | ✅ | ✅ | ✅ |
| Challenge other players | ❌ | ✅ | ✅ | ✅ |
| Team creation | ❌ | ❌ | ❌ | ✅ |
| Player tracking dashboard | ❌ | ❌ | ❌ | ✅ |
| Full leaderboard access | ❌ | ❌ | ❌ | ✅ |

### Coach tier — squad licence
A Coach subscription covers every player on the coach's team. Players on a coached team get the full Pro feature set at no cost to them. If a player leaves the team they revert to free unless they hold their own Pro subscription.

This makes the Coach tier worth $19.99 — you're buying a team licence, not just a personal account.

---

## New Files

### `hooks/useSubscription.ts`
Returns `{ isPremium: boolean, isCoach: boolean, isLoading: boolean }`.
- `isPremium` — true if user has active Pro or Coach entitlement, OR if their team's coach has an active Coach subscription (`team_is_pro = true` on profile), OR if `is_premium` manual override is set
- `isCoach` — true if user has active Coach entitlement
- Includes `DEV_PRO_OVERRIDE` and `DEV_COACH_OVERRIDE` flags (set to `true` during development, `null` before shipping)

### `app/(modals)/paywall.tsx`
- Two tabs: Pro / Coach
- Feature checklist per tier
- Annual plan pre-selected for Pro; monthly only for Coach
- Orange CTA button
- "Restore purchases" link

---

## Modified Files

- `app/_layout.tsx` — initialise RevenueCat SDK with `EXPO_PUBLIC_RC_IOS_KEY`
- `components/TrainPage/index.tsx` — gate custom timer presets behind `isPremium`
- `components/ProgressPage/index.tsx` — gate monthly chart view; cap session history at 3 for free users
- `app/(modals)/create-team.tsx` — gate team creation; redirect to paywall Coach tab
- `components/HomePage/TodayChallengeCard.tsx` — gate daily challenges behind `isPremium`
- `components/modals/ChallengeSetupModal.tsx` — gate player-to-player challenges behind `isPremium`

---

## Manual Setup (outside codebase — do before App Store submission)

### App Store Connect
1. Sign **Paid Applications Agreement** (Agreements, Tax, and Banking)
2. App → Monetization → Subscriptions → Create group: **"MasterTouch Pro"**
3. Add products:
   - `mastertouch_pro_monthly` — $4.99/mo, 7-day free trial
   - `mastertouch_pro_annual` — $34.99/yr
   - `mastertouch_coach_monthly` — $19.99/mo
4. Add English localization to all products
5. Create a **Sandbox Tester** (Users & Access → Sandbox Testers)

### RevenueCat
1. Create project **"MasterTouch"**, add iOS app (bundle ID: `com.timmparsons.mastertouch`)
2. Connect via App Store Connect API key (App Manager role)
3. Create entitlement IDs: `pro` and `coach`
4. Create a `default` offering (Pro plans) and a `coach` offering
5. Copy iOS SDK key → paste into `.env` as `EXPO_PUBLIC_RC_IOS_KEY`
6. Add webhook URL pointing to the Supabase edge function (see below)

### Supabase
1. Run migration:
   ```sql
   ALTER TABLE profiles ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT FALSE;
   ALTER TABLE profiles ADD COLUMN team_is_pro BOOLEAN NOT NULL DEFAULT FALSE;
   ```
2. Deploy `revenuecat-webhook` edge function:
   - On Coach subscription purchase/renewal → set `is_premium = true` on the coach's profile AND set `team_is_pro = true` on all profiles where `team_id` matches
   - On Coach subscription expiry/cancellation → reverse both
   - On Pro subscription purchase/renewal → set `is_premium = true` on the subscriber's profile only
   - On Pro subscription expiry → set `is_premium = false`
3. Set `DEV_PRO_OVERRIDE = null` and `DEV_COACH_OVERRIDE = null` in `hooks/useSubscription.ts` before shipping

---

## `useSubscription` — Premium Resolution Order

```
isCoach  = RevenueCat 'coach' entitlement active
isPremium = isCoach
         || RevenueCat 'pro' entitlement active
         || profile.is_premium === true       (manual/grandfathered)
         || profile.team_is_pro === true      (player on a coached team)
```

---

## Verification
1. Coach subscribes → `is_premium = true` on coach profile, `team_is_pro = true` on all team members
2. Team member opens app → `isPremium` resolves to `true` via `team_is_pro` → full Pro features unlocked
3. Coach subscription expires → `team_is_pro` flips back to `false` for all team members
4. Individual Pro purchase completes → `is_premium = true` on subscriber profile only
5. Pro user sees monthly chart toggle, full session history, all achievements, daily challenges, player challenges
6. Free user taps daily challenge → paywall (Pro tab)
7. Free user taps "Challenge a player" → paywall (Pro tab)
8. Free user taps "Create team" → paywall (Coach tab)
9. "Restore purchases" works on fresh install
