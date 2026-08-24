# Master Touch

A React Native training app for youth soccer players and their coaches. Players log daily juggling/touch practice, take on daily challenges and drills, and compete on team, club, and global leaderboards. Coaches manage rosters, track engagement, and assign daily focus areas.

Published on the App Store as **Master Touch** (`com.timmparsons.mastertouch`), though the repo is named `soccer-tracker`.

---

## Tech Stack

- **Framework:** Expo SDK 54, Expo Router 6 (typed routes), React Native 0.81 / React 19
- **Architecture:** New Architecture enabled, React Compiler enabled
- **Language:** TypeScript (strict mode)
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **Data fetching:** TanStack React Query
- **Payments:** RevenueCat (`react-native-purchases`) over Apple/Google IAP
- **Charts:** Victory Native, `react-native-chart-kit`
- **Camera/vision:** `react-native-vision-camera` (AI touch counting)
- **Animation:** Reanimated 4, Moti
- **Notifications:** `expo-notifications` (local only, no push server beyond the `send-push` edge function)
- **Testing:** Jest + `jest-expo` (see `__tests__/`)
- **Build/deploy:** EAS Build

---

## Getting Started

### Prerequisites

- Node.js >= 18
- Expo CLI (`npx expo`)
- A Supabase project
- Xcode / Android Studio for native builds (IAP and camera features require a dev build — they don't work in Expo Go)

### Install

```bash
npx expo install   # not npm install — keeps native deps aligned to the Expo SDK
```

### Environment variables

Create a `.env` with your Supabase project's URL and anon key (see `lib/supabase.ts` for the exact variable names it reads).

### Run

```bash
npm start           # Expo dev server
npm run ios         # iOS simulator
npm run android     # Android emulator
npm run web         # Web (limited — camera/IAP/native modules are gated behind Platform.OS checks)
```

### Test & lint

```bash
npm test            # Jest
npm run test:watch
npm run lint         # expo lint
```

### Build

```bash
eas build --platform ios
eas build --platform android
```
Profiles (`development`, `preview`, `production`) are defined in `eas.json`. Production builds auto-increment the build number; the `version` field in `app.json` must be bumped manually before each App Store submission.

---

## App Structure

Route groups under `app/` (Expo Router):

```
app/
├── (auth)/          # Sign in, sign up, password reset, intro
├── (onboarding)/     # Multi-step player and coach onboarding flows
├── (tabs)/           # Main tab bar
│   ├── index.tsx     # Home — Vinnie greeting, streak, today's progress, activity feed
│   ├── train.tsx     # Academy drills + Street (freeform) training
│   ├── progress.tsx  # Charts, heatmap, badges, season history
│   ├── leaderboard.tsx  # Team / Club / Global leaderboard tabs
│   ├── coach.tsx     # Coach dashboard (only meaningful for coach accounts)
│   └── profile.tsx   # Profile, settings, subscription
├── (modals)/         # create-team, join-team, drill-library, workouts,
│                     #   paywall, admin, roadmap
└── minigames/        # Standalone minigame routes (own Stack layout)
```

Shared UI primitives (Tile, PageHeader, CircularProgress, BadgeGrid, MiniSparkline, VinnieCard, etc.) live in `components/common/`. Screen-specific components are grouped by page (`components/HomePage`, `components/TrainPage`, `components/CoachDashboard`, etc.).

---

## Core Features

### For players
- **Touch tracking** — manual entry or AI-assisted counting via device camera (`react-native-vision-camera`), with a countdown timer
- **Daily challenges** — a challenge-of-the-day sized to the player's level, with combo/skill sequences and a streak counter
- **Drill library** — video-backed drills organized by difficulty (beginner/intermediate/advanced)
- **Workouts** — structured multi-drill/combo routines (`(modals)/workouts.tsx`, `hooks/useWorkouts.ts`) run through a guided `WorkoutRunnerModal`
- **Street mode** — freeform, unstructured training tab alongside the structured Academy drills
- **Badges** — individual and squad (team) badges awarded for milestones (`lib/checkBadges.ts`, `lib/checkSquadBadges.ts`)
- **Progress** — charts, an activity heatmap, and juggling personal records
- **Leaderboards** — Team (coach-managed squad), Club (parent organization across teams), and Global tabs; defaults to the most specific view the player qualifies for
- **Vinnie** — an AI coach mascot that reacts to sessions, streaks, sprints, and celebrations with mood-based messages (`lib/vinnie.ts`); richer coaching feedback is generated via Supabase Edge Functions
- **Daily sprint** — a timed skill-combo speed challenge with PR/crown detection
- **Local notifications** — daily practice reminders via `expo-notifications`
- **Activity feed & cheers** — teammates can react to each other's sessions

### For coaches
- **Team management** — create up to 3 teams per coach, each with an auto-generated join code; players join via code
- **Roster & player insights** — per-player stats, inactivity nudges, and coach "picks"
- **Coach challenges** — assign a daily skill focus/combination to the whole team
- **Seasons** — teams can archive a season and start fresh (season number + start date tracked per team)
- **Club structure** — teams can belong to a parent club; club leaderboard aggregates across teams

### Monetization
- RevenueCat entitlements: `pro` (player premium) and `coach` (coach access), read via `hooks/useSubscription.ts`
- `profiles.is_premium` acts as a manual/grandfather override independent of RevenueCat
- Admins and DB-flagged coaches (`is_admin`, `is_coach`) bypass subscription checks entirely
- Paywalls currently live at `(modals)/paywall.tsx` but the coach paywall gate has been intentionally disabled while the user base grows (see `PLANNING.md`)

---

## XP & Leveling

- Player level is derived from `total_xp` against a fixed threshold table (50 levels, `lib/xp.ts`), with rank names (Grassroots → Legend) and rank badge colors/icons per tier
- Teams track their own `team_xp` / `team_level` columns independently of player levels
- XP is awarded server-side (Postgres functions/triggers), not from client code

---

## Backend (Supabase)

- Auth state is managed centrally in `app/_layout.tsx` via `supabase.auth.onAuthStateChange`
- Schema migrations are plain SQL files at the repo root of `supabase/` (e.g. `daily_challenge_migration.sql`, `club_migration.sql`, `squad_badges_migration.sql`) rather than a single ordered migrations folder — check `supabase/schema/` and run/inspect via the Supabase CLI or MCP tools before assuming structure
- Edge Functions (`supabase/functions/`):
  - `create-managed-player` — coach-created player accounts
  - `revenuecat-webhook` — syncs subscription entitlements into `profiles`
  - `send-push` — sends push notifications
- Use the Supabase MCP tools (`list_tables`, `get_advisors`, `get_logs`, etc.) for inspecting the live project rather than guessing from the SQL files alone

---

## Project Docs

- `CLAUDE.md` — coding conventions and architecture rules for AI-assisted development in this repo
- `PLANNING.md` — future feature ideas, and detailed notes on what was intentionally removed/deferred (e.g. paywalls) and how to restore it
- `BACKLOG.md` — task backlog
- `SUBSCRIPTION-PLAN.md` — plan for introducing a paid tier without breaking the "free" positioning the website/SEO strategy relies on
- `docs/plans/` — design docs for specific features (AI touch counter, coach dashboard, push notifications, coin system, etc.)
- `docs/testing.md` — testing notes
- `app.md` — current App Store listing snapshot (description, keywords, screenshots)
- `website/` — marketing/SEO site and a free 30-day touch challenge course, deployed at mastertouch.app

---

## Current Status

Live on the App Store, free with no subscription yet (subscription launch is planned — see `SUBSCRIPTION-PLAN.md`). In active use with a youth soccer team for real-world feedback.
