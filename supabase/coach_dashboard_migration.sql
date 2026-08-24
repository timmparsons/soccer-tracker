-- Coach Dashboard Phase 2: Nudge (cooldown/audit column on profiles) and
-- Coach's Choice (one team-wide daily pick, award-instance table — same
-- shape as squad_badges: each row is one earned instance). Cheer needs no
-- schema change: it reuses feed_cheers with a synthetic feed_item_key of
-- the form `coach-cheer-{playerId}-{date}` (see lib/coachCheerKey.ts).
-- Note needs no schema change: ephemeral push only, nothing persisted.

-- No new RLS policy needed for this column: profiles already has
-- coach_update_player_coins / coach_update_player_team, both permissive
-- UPDATE policies scoped by `coach.team_id = profiles.team_id` with no
-- WITH CHECK — row-scoped, not column-scoped, so already covers this.
alter table profiles add column last_nudged_at timestamptz;

-- One pick per team per day — scarcity is the point. Re-picking a
-- different player the same day replaces the row (delete+insert from the
-- client, see hooks/useCoachPicks.ts).
create table coach_picks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  coach_id uuid not null references profiles(id) on delete cascade,
  player_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (team_id, date)
);

create index idx_coach_picks_team on coach_picks (team_id, date desc);
create index idx_coach_picks_player on coach_picks (player_id, created_at desc);

alter table coach_picks enable row level security;

create policy "coach_picks_select" on coach_picks for select using (true);

create policy "coach_picks_insert" on coach_picks for insert
  with check (
    coach_id = auth.uid()
    and exists (select 1 from teams t where t.id = team_id and t.coach_id = auth.uid())
  );

create policy "coach_picks_delete" on coach_picks for delete
  using (
    coach_id = auth.uid()
    and exists (select 1 from teams t where t.id = team_id and t.coach_id = auth.uid())
  );
