# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Claude Code Guidelines — Soccer Tracker

The app is published as **Master Touch** (bundle ID `com.timmparsons.mastertouch`), though the repo is named `soccer-tracker`. Current version: `2.4.10`.

## Dev Commands

```bash
npm start                          # Start Expo dev server
npm run ios                        # Run on iOS simulator
npm run android                    # Run on Android emulator
npm run web                        # Run web version
npm run lint                       # Lint with expo lint
npx expo install <package>         # Install Expo-compatible package (not npm install)
eas build --platform ios           # Build for App Store (uses eas.json profiles)
eas build --platform android       # Build for Play Store
```

No test framework is configured — there are no tests to run.

## Commits
- **Always provide a commit message** after completing a task, but wait for explicit approval before running `git commit`. Stage only the files changed for that task.
- Commit message format: lowercase, no period, action-oriented verb, ~50 chars
  - Examples: `add local notifications for practice reminders`, `fix juggling record display bug`
- No co-author lines in commits

## Package Manager
- Use **npm** (not bun, yarn, or pnpm). Lock file is `package-lock.json`.
- Install Expo packages with `npx expo install`, not `npm install`, so SDK versions stay compatible.

## TypeScript
- Strict mode is on — no `any` unless absolutely unavoidable.
- Use the `@/` import alias for all project files (configured in `tsconfig.json`).
- Never disable TS errors with `@ts-ignore` or `@ts-expect-error` without a comment explaining why.

## Code Style
- **Single quotes** for all JS/TS strings. Double quotes only in JSX attribute values and StyleSheet hex colours.
- **Semicolons** always.
- Functional components only — no class components.
- Keep styles in `StyleSheet.create()` at the bottom of each file. No external CSS.
- Inline styles only for dynamic values (e.g. `style={{ width: \`${pct}%\` }}`).
- Section comments are fine (e.g. `// SIGN IN`, `// 🔐 Auth init`) — keep them short.

## Architecture
- Data fetching lives in **custom hooks** (`hooks/`) using React Query. Components should call hooks, not query Supabase directly.
- Business logic goes in **`lib/`**. Pure helper functions go in **`utils/`**.
- React Query query keys follow the pattern `['resource', id]` (e.g. `['profile', userId]`).
- Auth state is managed in `app/_layout.tsx` via `supabase.auth.onAuthStateChange` — don't duplicate this elsewhere.
- Supabase client is in `lib/supabase.ts` (uses AsyncStorage for session persistence).
- XP/level logic lives in `lib/xp.ts` and `lib/awardXp.ts`. 1 XP per 10 juggles; teams level up at 500 XP.
- Vinnie (AI coach) responses are local in `lib/vinnie.ts` — celebration messages and mood states, not an Edge Function call.
- i18n uses i18next; strings live in `locales/en-US.json`, initialised in `utils/i18n.ts`.
- Route groups: `(auth)`, `(tabs)`, `(onboarding)`, `(modals)`, `minigames`.
- Shared UI primitives (Tile, WideTile, GradientTile, ProgressBar, PageHeader, etc.) live in `components/common/`.

## Expo / React Native
- Expo Router SDK 54, New Architecture, React Compiler, and Typed Routes are all enabled.
- Use `expo-notifications` for local notifications (no server push needed).
- Platform guards (`Platform.OS === 'web'`) are required in any native-only utility.
- EAS build profiles: `development` (internal), `preview` (internal), `production` (store + auto-increment version).

## Design System
- Primary colours: `#1f89ee` (blue), `#ffb724` (orange), `#1a1a2e` (dark).
- Success/positive: `#31af4d`. Muted text: `#78909C`.
- Font weights used: `'600'` (body), `'700'` (labels), `'900'` (headings/buttons).
- Border radius conventions: inputs `12`, cards `16–24`, buttons `14–16`.

## App Store Builds
- When a session wraps up with meaningful changes, ask: "Are you building this for submission?" If yes, bump the `version` in `app.json` (patch increment, e.g. `2.2.11` → `2.2.12`) before the build.
- `autoIncrement: true` in `eas.json` handles the build number automatically — only `version` needs manual bumping.
- Apple rejects builds where the version is the same as or lower than a previously submitted build.

---

## App Routes

**Tabs (`app/(tabs)/`):**
- `index.tsx` — Home/Team dashboard. Shows `CoachDashboard` for coaches, player home for others.
- `progress.tsx` — Player progress charts & stats (hidden for coaches).
- `train.tsx` — Training session & touch logging (hidden for coaches).
- `coach.tsx` — Coach panel UI (rendered inside index, not directly in tab bar).
- `leaderboard.tsx` — Leaderboard for coaches; compete/challenges tab for players.
- `profile.tsx` — Profile, settings, season history.

**Auth (`app/(auth)/`):**
- `index.tsx` — Login / sign-up.
- `intro.tsx` — Onboarding intro screen.
- `reset-password.tsx` — Password recovery.

**Onboarding (`app/(onboarding)/`):**
- `index.tsx` — New-user onboarding flow.

**Modals (`app/(modals)/`):**
- `paywall.tsx` — Subscription upsell.
- `admin.tsx` — Admin/dev panel.
- `team-badges.tsx` — Team badge browser.
- `suggestions.tsx` — User feedback/suggestions.
- `drill-library.tsx` — Full drill library.
- `join-team.tsx` — Join team via code.
- `create-team.tsx` — Create a new team.
- `roadmap/index.tsx` — Feature roadmap.

**Minigames (`app/minigames/`):**
- `cone-dribble` — Only implemented minigame (camera-based dribbling drill).

---

## Database Tables

| Table | Key Columns |
|---|---|
| `profiles` | `id`, `display_name`, `avatar_url`, `team_id`, `is_coach`, `is_premium`, `is_admin`, `coins`, `total_xp`, `expo_push_token` |
| `teams` | `id`, `name`, `code`, `coach_id`, `team_xp`, `team_level`, `season_number` |
| `daily_sessions` | `id`, `user_id`, `touches_logged`, `duration_minutes`, `drill_id`, `date`, `juggle_count`, `is_timed_challenge`, `challenge_duration_seconds` |
| `player_challenges` | `id`, `challenger_id`, `challenged_id`, `touches_target`, `time_limit_hours`, `status`, `deadline_at`, `winner_id` |
| `coach_challenges` | `id`, `coach_id`, `player_id`, `touches_target`, `due_date`, `status` |
| `group_challenges` | `id`, `team_id`, `touches_target`, `time_limit_hours`, `deadline_at` |
| `group_challenge_participants` | `challenge_id`, `user_id`, `time_seconds`, `completed_at` |
| `badges` | `id`, `category`, `name`, `description`, `icon`, `color`, `sort_order` |
| `user_badges` | `user_id`, `badge_id`, `earned_at` |
| `team_badges` | `team_id`, `badge_type`, `week_start` |
| `leaderboard_wins` | `week_start`, `user_id` |
| `drills` | `id`, `name`, `difficulty_level`, `description`, `video_url` |
| `user_targets` | `user_id`, `daily_target_touches` |
| `coin_transactions` | `id`, `coach_id`, `player_id`, `amount`, `note` |

---

## Hooks Reference

| Hook | Purpose |
|---|---|
| `useProfile` | Current user's profile + team |
| `useUpdateProfile` | Mutation to update profile fields |
| `useTeam` | Player's team details |
| `useCoachTeams` | All teams the user coaches |
| `useTeamPlayers` | Team roster |
| `useCoachTeamPlayerCounts` | Per-player stats for coach dashboard |
| `useTouchTracking` | Daily/weekly touches, TPM, streak, session history |
| `useTouchCounter` / `.native` | Real-time camera-based touch counting |
| `useDailyTouchHistory` | 7-day touch history array |
| `usePlayerChallenges` | 1v1 player challenges |
| `useCoachChallenges` | Coach-assigned targets |
| `usePlayerCoachChallenges` | Player's view of coach challenges |
| `useGroupChallenges` | N-way team group challenges |
| `useChallengeStats` | Challenge streak & daily completion |
| `useJugglingRecord` | Personal best juggle count |
| `useTodayChallenge` | Seeded daily challenge drill |
| `useDrills` | Drill library |
| `useLeaderboard` | Team weekly/all-time leaderboard |
| `useGlobalLeaderboard` | Cross-team global leaderboard |
| `useTimedChallengeLeaderboard` | Timed challenge rankings |
| `useSeasons` | Season management (create/archive) |
| `useArchivedSeasons` | Past season history |
| `useBadges` | All badges, user's earned badges, leaderboard wins |
| `useTeamBadges` | Team's weekly earned badges |
| `useCoins` | Player coin balance |
| `useCoinTransactions` | Coin transaction history |
| `useSubscription` | RevenueCat — `isPro`, `isCoach` entitlements |
| `useCoachingTips` | Rotating coaching tips |
| `useSuggestions` | User feedback submissions |
| `useTeamDailySessions` | Team daily session logs |

---

## Key Lib Files

- **`lib/xp.ts`** — 50-level XP thresholds, rank names (Grassroots → Legend), rank badge colours/icons.
- **`lib/awardXp.ts`** — Award XP to a user for a given event type.
- **`lib/checkBadges.ts`** — Badge qualification logic: streak (3/7/30/100/365d), volume (1k→1M touches), session count, performance, social, challenge tier, drill completion.
- **`lib/checkTeamBadges.ts`** — Weekly team challenge evaluation.
- **`lib/teamBadges.ts`** — 10 rotating weekly team challenges (Squad Goal, All In, Showing Up, Hat-trick, Streak Squad, 75 Hard, Five-A-Week, Juggle Nation, Monster Week, All In Again).
- **`lib/teamUnlockables.ts`** — Features unlocked at each team XP level.
- **`lib/notifications.ts`** — Local push notification scheduling (inactivity reminders).
- **`lib/vinnie.ts`** — Coach Vinnie AI character: local celebration messages and mood states.

---

## Subscription & Pro Gating

Subscriptions are managed via **RevenueCat**. The `useSubscription` hook exposes:
- `isPro` — Pro entitlement.
- `isCoach` — Coach entitlement (also implies premium).
- `profiles.is_premium` — Manual/grandfathered override.
- `profiles.is_admin` — Bypasses all gates for testing.

Coach/Pro-gated features: coach dashboard, team management, 1v1 challenge creation, coin awarding, premium drills.

Dev overrides: `DEV_PRO_OVERRIDE` and `DEV_COACH_OVERRIDE` constants in `useSubscription.ts`.

**Edge Function `revenuecat-webhook`** handles RevenueCat events (INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION) and syncs `is_premium` on the `profiles` table.

---

## Supabase Edge Functions

- **`send-push`** — Sends push notifications via Expo push service.
- **`revenuecat-webhook`** — Syncs RevenueCat subscription events to `profiles.is_premium`.
- **`create-managed-player`** — Coach endpoint to create managed player accounts.

Prefer Expo-side logic over new Edge Functions for new features.

---

## What NOT to Do
- Don't add docstrings, comments, or type annotations to code that wasn't changed.
- Don't add error handling for scenarios that can't happen — only validate at system boundaries.
- Don't create new abstractions for one-off operations.
- Don't push to remote unless explicitly asked.
- Don't auto-commit — always show the commit message for review first (or commit immediately after completing the task as agreed).
- Don't use emojis in code, UI strings, or responses unless explicitly asked.
- Don't create new Supabase Edge Functions when Expo-side logic works.
