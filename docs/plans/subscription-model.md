# Plan: MasterTouch Pro — Subscription Model

## Overview
Single subscription tier: **MasterTouch Pro**
- Monthly: $4.99 (7-day free trial)
- Annual: $34.99 (pre-selected, saves 42%)

**Stack:** RevenueCat (`react-native-purchases`) wrapping the App Store. iOS only for now (Google Play on hold).

---

## Premium Features Gated

| Feature | Free | Pro | Coach |
|---------|------|-----|-------|
| Chart view | 7-day only | 7-day + monthly | 7-day + monthly |
| Session history | Last 3 sessions | Full history | Full history |
| Achievements | First 3 unlocked | All achievements | All achievements |
| Team creation | ❌ | ❌ | ✅ |
| Timer presets | 1 min + 5 min only | Custom input | Custom input |
| Daily challenges | ❌ | ✅ | ✅ |
| Challenge other players | ❌ | ✅ | ✅ |

---

## New Files

### `hooks/usePremium.ts`
Returns `{ isPremium: boolean, isLoading: boolean }`. Wraps RevenueCat entitlement check for `'pro'`. Includes `DEV_PREMIUM_OVERRIDE` flag (set to `true` during development, `null` before shipping).

### `app/(modals)/paywall.tsx`
- Blue gradient header
- Feature checklist (what you get with Pro)
- Annual plan pre-selected
- Orange CTA button
- "Restore purchases" link

---

## Modified Files

- `app/_layout.tsx` — initialise RevenueCat SDK with `EXPO_PUBLIC_RC_IOS_KEY`
- `components/TrainPage/index.tsx` — gate custom timer presets behind `isPremium`
- `components/ProgressPage/index.tsx` — gate monthly chart view; cap session history at 3 for free users
- `app/(modals)/create-team.tsx` — gate team creation; redirect free users to paywall

---

## Manual Setup (outside codebase — do before App Store submission)

### App Store Connect
1. Sign **Paid Applications Agreement** (Agreements, Tax, and Banking)
2. App → Monetization → Subscriptions → Create group: **"MasterTouch Pro"**
3. Add products:
   - `mastertouch_pro_monthly` — $4.99/mo, 7-day free trial
   - `mastertouch_pro_annual` — $34.99/yr
4. Add English localization to both products
5. Create a **Sandbox Tester** (Users & Access → Sandbox Testers)

### RevenueCat
1. Create project **"MasterTouch"**, add iOS app (bundle ID: `com.timmparsons.mastertouch`)
2. Connect via App Store Connect API key (App Manager role)
3. Create entitlement ID: `pro`
4. Create products, packages, and a `default` offering
5. Copy iOS SDK key → paste into `.env` as `EXPO_PUBLIC_RC_IOS_KEY`
6. Add webhook URL pointing to the Supabase edge function (see below)

### Supabase
1. Run migration: `ALTER TABLE profiles ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT FALSE;`
2. Deploy `revenuecat-webhook` edge function — syncs `is_premium` on purchase/renewal/expiration
3. Set `DEV_PREMIUM_OVERRIDE = null` in `hooks/usePremium.ts` before shipping

---

## Verification
1. Sandbox purchase completes → `is_premium` flips to `true` in Supabase
2. Pro user sees monthly chart toggle, full session history, all achievements
3. Free user hits team creation → paywall appears
4. Subscription expiry → `is_premium` flips back to `false`, features re-gate
5. "Restore purchases" works on fresh install
