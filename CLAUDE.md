# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Claude Code Guidelines — Soccer Tracker

The app is published as **Master Touch** (bundle ID `com.timmparsons.mastertouch`), though the repo is named `soccer-tracker`.

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
- Vinnie (AI coach) responses come from Supabase Edge Functions — see `lib/vinnie.ts`.
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

## What NOT to Do
- Don't add docstrings, comments, or type annotations to code that wasn't changed.
- Don't add error handling for scenarios that can't happen — only validate at system boundaries.
- Don't create new abstractions for one-off operations.
- Don't push to remote unless explicitly asked.
- Don't auto-commit — always show the commit message for review first (or commit immediately after completing the task as agreed).
