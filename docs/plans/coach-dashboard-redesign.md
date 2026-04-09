# Plan: Coach Dashboard Redesign

## Context
The current coach.tsx is a 1550-line monolith — one long scroll with a stats grid, AI tips, top performer, player list, and "needs attention" card. It buries the most important signal (who trained today?) under a wall of aggregate numbers. A coach at a top academy doesn't want totals — they want patterns: who's building a habit, who's gone quiet, who had a breakout session.

This redesign splits the coach screen into **3 focused tabs** (Squad, Leaderboard, Manage), introduces a **weekly training heatmap** for instant pattern recognition, a **player detail bottom sheet** for per-player deep dives, and a fully functional **team management screen** for coaches with multiple teams. No DB changes needed — all required data already exists.

---

## Navigation Structure

Replace the single scroll with a custom in-screen tab bar (same pattern as `components/Leaderboard/index.tsx`):

```
coach.tsx (thin shell — auth guard + shared data fetch)
  └── CoachDashboard/index.tsx
        ├── Tab: Squad     ← main daily monitoring view
        ├── Tab: Leaderboard ← renders existing <Leaderboard /> as-is
        └── Tab: Manage    ← full team management
```

Tab bar: horizontal `View`, 3 `TouchableOpacity` items, active tab has `borderBottomWidth: 2, borderBottomColor: '#1f89ee'`. Inactive color `#78909C`.

---

## New File Structure

```
components/CoachDashboard/
  index.tsx                  ← tab shell, owns shared data fetch props
  SquadTab.tsx               ← composes all Squad tab sections
  WeekGrid.tsx               ← heatmap grid (THE key component)
  SelectedDaySummary.tsx     ← summary pill bar below grid
  PlayerRow.tsx              ← single row in the player list
  PlayerDetailSheet.tsx      ← bottom sheet: stats + chart + actions
  MiniBarChart.tsx           ← 7-day bar chart (pure View layout, no library)
  AiTipsCard.tsx             ← collapsible wrapper for existing AI tips logic
  ManageTab.tsx              ← team management screen
  TeamCard.tsx               ← per-team card with code + player management
  CreateTeamSheet.tsx        ← bottom sheet for adding a new team

hooks/
  useTeamDailySessions.ts    ← NEW: per-player per-day sessions for Mon–Sun heatmap
  useCoachTeamPlayerCounts.ts ← NEW: player count per team for Manage tab
```

`app/(tabs)/coach.tsx` becomes ~50 lines: auth guards + data fetch + `<CoachDashboard {...props} />`.

---

## Tab 1: Squad

### Team Health Bar (top, above grid)

Single line, 3 values: `"X/Y trained today"` · `"Avg streak: Z days"` · `"X hit target"`

- `fontSize: 13`, `fontWeight: '600'`, `color: '#78909C'`
- No card/border — just a clean info line, `paddingHorizontal: 20, paddingVertical: 8`

---

### WeekGrid Component — The Core Feature

An at-a-glance training attendance board. Academy coaches track habit, not just volume.

**Data needed**: new hook `useTeamDailySessions(teamId, playerIds)`
```typescript
// queryKey: ['team-daily-sessions', teamId, weekStart]
// Query: daily_sessions WHERE user_id IN [...playerIds] AND date >= monday AND date <= sunday
// Returns: Record<playerId, Record<dateString, { touches: number; hitTarget: boolean }>>
// Monday = date - (date.getDay() || 7) + 1  (ISO week, Mon–Sun, not Sun–Sat)
```

**WeekGrid props**:
```typescript
interface WeekGridProps {
  players: PlayerStats[];
  sessionMap: Record<string, Record<string, { touches: number; hitTarget: boolean }>>;
  weekDates: string[];        // 7 date strings ['2026-04-07', ..., '2026-04-13'] Mon→Sun
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPlayerPress: (player: PlayerStats) => void;
}
```

**Column header row**: day labels `['M','T','W','T','F','S','S']`. Today's column has a blue dot underneath. Tapping a label calls `onSelectDate`. Selected column label: `color: '#1f89ee'` + `borderBottomWidth: 2`.

**Player rows**: `{ avatar (28px) + first name (60px, fontSize 11, truncated) } + 7 cells`

**Cell spec** (32×32, `borderRadius: 6`, `margin: 2`):
- Hit target → `backgroundColor: '#31af4d'` (dark green)
- Trained, below target → `backgroundColor: '#92d19e'` (light green)
- No session → `backgroundColor: '#1e1e3a'` + `borderWidth: 1, borderColor: '#2d2d5a'`
- Selected column → all cells in that column get `borderWidth: 1.5, borderColor: '#1f89ee'`

Grid wraps in a fixed-height `ScrollView` (~240px) if > 12 players, with the day header pinned outside the scroll.

---

### SelectedDaySummary Component

Sits below WeekGrid. Shown whenever a date is selected (default: today on mount).

Three pills: `"X trained"` · `"Avg Y touches"` · `"Z hit target"`

Style: `backgroundColor: '#EEF2FF'`, `borderRadius: 20`, `paddingHorizontal: 12`, `paddingVertical: 6`, `fontSize: 13`, `fontWeight: '700'`

---

### Player List

**Sorted by**: `days_active_this_week DESC`, then `week_touches DESC` — consistency first, volume second.

Players who trained on `selectedDate` get `borderLeftWidth: 3, borderLeftColor: '#1f89ee'` accent (visual grouping without reordering).

**PlayerRow layout** (left → right):
1. Avatar 40px — `borderColor: player.today_touches > 0 ? '#31af4d' : '#E5E7EB'`
2. Name (fontSize 15, fontWeight 700) + 7 dot pips below (8px dots, `#31af4d` / `#92d19e` / `#E5E7EB`)
3. Today pill — shown only if `today_touches > 0`: green pill with touch count
4. Week total — fontSize 16, fontWeight 900, `color: '#1f89ee'`
5. Streak — `🔥 {n}` if `current_streak > 0`, fontSize 12
6. Chevron `›`

---

### AiTipsCard (Collapsible)

Existing AI tips logic wrapped in a collapsible card. Default: collapsed. Header row shows "Training Tips · AI" + chevron. Keeps the Squad tab compact — coach can expand when they want it.

---

## Tab 2: Leaderboard

Zero new code:

```tsx
// Inside CoachDashboard when activeTab === 'leaderboard':
<Leaderboard />
```

The existing component is fully self-contained. Add a subtle `"Coach View"` label (fontSize 11, `color: '#78909C'`) top-right for visual clarity.

---

## Tab 3: Manage

Full team management — the biggest gap in the current app.

### Layout

```
ManageTab
  ├── "My Teams" header + team count badge
  ├── {coachTeams.map(team => <TeamCard />)}
  └── "Add New Team" button (orange, full width)
      └── Disabled + lock icon if teams.length >= 3
```

### TeamCard Component

Props: `team`, `playerCount`, `isActive`, `onSwitchToActive`, `isExpanded`, `onToggleExpand`

**Collapsed view**:
- Team name (fontWeight 900) + `Season {n}` badge + `{playerCount} players`
- Active team: `borderWidth: 2, borderColor: '#1f89ee'`
- Team code displayed in large mono text (fontSize 28, `letterSpacing: 6`) — same style as existing `TeamCodeCard`
- **Copy** button + **Share** button (native share sheet) inline
- "Set Active" button if not active team
- `›` chevron to expand

**Expanded view** (toggles with local `isExpanded` state):
- Player list with remove button per row (existing `handleRemovePlayer` logic)
- "Add Player" button → existing `create-managed-player` Edge Function flow
- "Start New Season" button → existing `useStartNewSeason` hook
- "Archive Team" button (red text) → 2-step `Alert.alert` confirmation → remove all players from team + delete team row

### CreateTeamSheet Component

Bottom sheet (not a new route). Embeds the same team name input + `generateTeamCode` + uniqueness check logic from `app/(modals)/create-team.tsx`. On success: shows the new team code prominently + Copy/Share buttons. Invalidates `['coach-teams', userId]` and `['coach-team-player-counts', userId]`.

### New hook: useCoachTeamPlayerCounts

```typescript
// queryKey: ['coach-team-player-counts', userId]
// Single query: profiles WHERE team_id IN [...teamIds] AND is_coach = false
// Returns: Record<teamId, number>
```

---

## Player Detail Sheet

Opens when a player row is tapped anywhere in the Squad tab. Bottom sheet (`Modal` with `transparent={true}`, `animationType='slide'`, handle bar at top).

**Header**: Avatar (56px) + name + streak badge + close button

**Stat pills** (horizontal ScrollView, 3 pills):
- TODAY: touches count or "Rest day" + target checkmark if hit
- YESTERDAY: touches or "—"
- THIS WEEK: `"{touches} touches · {d}/7 days · {tpm}/min"`

**MiniBarChart** (7 days, pure View — no library):
- 7 columns, each column = day label (M/T/W…) + bar View
- Bar height = `Math.max(4, (touches / dailyTarget) * 50)` px
- Color: `#31af4d` if hit target, `#1f89ee` if trained below, `#E5E7EB` if no session
- Total container height: 80px

Data for chart: `useQuery(['player-recent-sessions', player.id], { enabled: visible })` — fetches last 7 `daily_sessions` for this player. Scoped to when the sheet is open to avoid loading all players' sessions upfront.

**Recent sessions** (last 3): date + touches + duration + TPM

**Action buttons** (3 equal-width, row):
- "Log Session" → `#1f89ee` → opens existing log touches modal
- "Challenge" → `#ffb724` → opens CoachChallengeModal
- "Award Coins" → `#31af4d` → opens coin award modal (from coin-system plan)

---

## Phased Build Order

Build in this order to keep the app working at each stage:

1. **Tab shell** — Add 3-tab structure to coach.tsx, Squad tab initially renders current screen content unchanged. Leaderboard tab renders existing `<Leaderboard />`. Manage tab renders existing `<TeamCodeCard />`.

2. **Manage tab** — Build `ManageTab.tsx` with `TeamCard`, multi-team list, `CreateTeamSheet`. This is self-contained and unblocks coaches with multiple teams immediately.

3. **WeekGrid + SelectedDaySummary** — Build `useTeamDailySessions`, then `WeekGrid.tsx`. Add to top of Squad tab above the existing player list.

4. **PlayerRow + sorting** — Replace the existing player list rows in Squad tab with `PlayerRow.tsx` (adds pips + consistency sort).

5. **PlayerDetailSheet** — Replace the existing tap-to-modal with the new bottom sheet. Wire Log Session / Challenge / Award Coins actions to existing handlers.

6. **Slim coach.tsx** — Once all components are extracted, reduce coach.tsx to the thin shell.

---

## Critical Files

- `app/(tabs)/coach.tsx` — entry point, thin shell after refactor
- `components/Leaderboard/index.tsx` — reused as-is in Leaderboard tab
- `components/coach/TeamCodeCard.tsx` — reused in Manage tab (copy code, share, add player)
- `hooks/useCoachTeams.ts` — already returns `{ id, name, code, season_number }[]`
- `hooks/useSeasons.ts` — `useStartNewSeason` reused in Manage tab

## New hooks
- `hooks/useTeamDailySessions.ts` — heatmap data
- `hooks/useCoachTeamPlayerCounts.ts` — player counts per team in Manage tab

## DB changes
**None.** All required data exists in the current schema.

---

## Verification

1. `npm start` → Coach tab shows 3-tab bar (Squad / Leaderboard / Manage)
2. Squad → WeekGrid renders with correct colors for trained/not-trained days
3. Tap a day column → SelectedDaySummary shows correct counts for that day
4. Tap a player → PlayerDetailSheet opens with bar chart + 3 action buttons
5. "Log Session" action → existing modal fires correctly
6. Leaderboard tab → identical to what players see
7. Manage tab → all teams listed with codes, copy/share works, add player works
8. Add New Team → code generated, shown immediately, team appears in list
9. Archive Team → confirmation dialog → team removed, coach team list updates
10. Coach with 3 teams → "Add New Team" button is disabled
