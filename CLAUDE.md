# Claude Code Guidelines — Soccer Tracker

## Commits
- **Always create a commit** after completing a task. Stage only the files changed for that task.
- Commit message format: lowercase, no period, action-oriented verb, ~50 chars
  - Examples: `add local notifications for practice reminders`, `fix juggling record display bug`
- Always co-author: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

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

## Expo / React Native
- This project uses **Expo Router** (file-based routing) with SDK 54, New Architecture, and React Compiler enabled.
- Route groups: `(auth)`, `(tabs)`, `(onboarding)`, `minigames`.
- Use `expo-notifications` for local notifications (no server push needed).
- Platform guards (`Platform.OS === 'web'`) are required in any native-only utility.

## Design System
- Primary colours: `#2B9FFF` (blue), `#FFA500` (orange), `#FF7043` (coral), `#1a1a2e` (dark).
- Success/positive: `#10B981`. Muted text: `#78909C`.
- Font weights used: `'600'` (body), `'700'` (labels), `'900'` (headings/buttons).
- Border radius conventions: inputs `12`, cards `16–24`, buttons `14–16`.

## What NOT to Do
- Don't add docstrings, comments, or type annotations to code that wasn't changed.
- Don't add error handling for scenarios that can't happen — only validate at system boundaries.
- Don't create new abstractions for one-off operations.
- Don't push to remote unless explicitly asked.
- Don't auto-commit — always show the commit message for review first (or commit immediately after completing the task as agreed).
