# Onboarding + Team Lifecycle Plan

## Context
The app needs to handle three interconnected concerns:
1. Players should be able to join a team during onboarding (not just post-signup via a modal)
2. Coaches have three distinct "new team" scenarios that each need defined behaviour
3. When a team ends, players on a coach's Pro plan need a grace period before losing Pro features

Coach identity is **not** changing — `is_coach` is still set when a coach creates their first team, not during onboarding. Only the player path changes.

---

## Part 1: Player Onboarding — Team Code Entry

### What changes
Add an optional "Join a Team" step to `app/(onboarding)/index.tsx` as a new slide between the goal selection and the "Let's Begin" finish slide.

### Slide design
- Heading: "Got a team code?"
- Subtext: "Your coach will have given you an 8-character code"
- Text input (same style as join-team modal: uppercase, 8-char limit)
- "Join Team" button (disabled until 8 chars entered)
- "Skip for now" link below

### Logic
- On submit: reuse the same lookup logic from `app/(modals)/join-team.tsx` (case-insensitive `ilike` query on `teams.code`, update `profiles.team_id`)
- On skip or success: advance to finish slide
- Validation errors shown inline (invalid code, already on a team)
- If user already has a `team_id` (edge case), skip the slide entirely

### Files to change
- `app/(onboarding)/index.tsx` — add new slide (index 1, shift "Let's Begin" to index 2)
- Extract a `useJoinTeam` mutation from `app/(modals)/join-team.tsx` for reuse

---

## Part 2: Three "New Team" Scenarios

### Scenario A — Coach starts a new season (same team, new code)
**Already implemented** via `useStartNewSeason`. Code regenerates, players stay.
- No change needed to player `team_id` — existing players remain on the team
- New code is for inviting new players only
- No Pro impact (team continuity, coach subscription unchanged)

### Scenario B — Coach creates a second/third team (parallel)
**Already supported** up to 3 teams. No changes needed.
- Old team continues unchanged
- Coach switches between teams via the team picker in `app/(tabs)/coach.tsx`

### Scenario C — Coach ends a team entirely (dissolve + replace)
**Not yet implemented.** Needs a full "End Team" flow.

#### UI
- Add "End Team" destructive option in coach settings/team management
- Confirm alert: "This will remove all players from the team. They will keep Pro features for 30 days."

#### What happens on end
1. Fetch all `profiles` where `team_id = teamId`
2. For each player:
   - Set `team_id = null`
   - Set `team_is_pro = false`
   - Set `team_pro_grace_until = now() + 30 days` (new column — see DB changes)
3. Delete (or soft-archive) the team record
4. If coach's own `team_id` pointed to this team, set it to another of their teams (or null)
5. Invalidate React Query caches for `['team', ...]` and `['profile', ...]`

#### Files to change
- `hooks/useCoachTeams.ts` — add `useEndTeam` mutation
- `app/(tabs)/coach.tsx` — add "End Team" button
- DB migration (see below)

---

## Part 3: Pro Grace Period

### DB changes required
```sql
ALTER TABLE profiles
  ADD COLUMN team_pro_grace_until TIMESTAMPTZ NULL;
```

### isPremium logic (when `useSubscription` is built)
```typescript
const isPremium =
  profile.is_premium ||
  profile.team_is_pro ||
  (profile.team_pro_grace_until && new Date(profile.team_pro_grace_until) > new Date());
```

No background job needed — enforced client-side on every session load.

### When grace period applies
- Only when a coach explicitly ends a team (Scenario C)
- Does NOT apply if a player leaves voluntarily
- Does NOT apply if coach's subscription lapses (handled by RevenueCat webhook separately)

---

## DB Migration Summary
```sql
-- Required before Part 3 can ship
ALTER TABLE profiles
  ADD COLUMN team_pro_grace_until TIMESTAMPTZ NULL;
```
`is_premium` and `team_is_pro` are also needed (from subscription-model.md) but are pre-existing planned migrations.

---

## Verification
1. **Player onboarding code entry**: Sign up fresh → complete goal step → enter a valid team code → confirm `profiles.team_id` is set before hitting main app
2. **Skip**: Same flow, tap skip → confirm `team_id` is null, onboarding completes normally
3. **Invalid code**: Enter gibberish → confirm inline error, no navigation
4. **End team**: As coach, end a team → confirm all players have `team_id = null`, `team_pro_grace_until = 30 days from now` → log in as a player → confirm Pro features still accessible → fast-forward date past grace → confirm features locked
5. **Season start**: Start new season → confirm existing players stay, new code generated, no profile changes

---

## Out of Scope (this plan)
- RevenueCat webhook wiring for subscription lapse
- UI feedback to players when a new season starts
- `useSubscription` / `usePremium` hook implementation (separate monetization branch)
