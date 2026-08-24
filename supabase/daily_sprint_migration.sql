-- Daily Sprint: standalone 5-rep timed combo, separate from the existing
-- daily_challenges/daily_challenge_completions circuit-challenge system.
-- Reuses real drill UUIDs from hooks/useDailyChallenge.ts (DRILL_IDS) rather
-- than inventing new drill identities.

create table sprint_combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  drill_ids uuid[] not null,
  reps smallint not null default 5,
  crown_threshold_ms integer not null check (crown_threshold_ms > 0),
  created_at timestamptz not null default now()
);

-- One row per calendar day; combo is picked from sprint_combos via a
-- date-seeded rotation, same approach as daily_challenges' fallback pool.
create table daily_sprints (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  combo_id uuid not null references sprint_combos(id),
  created_at timestamptz not null default now()
);

-- Every attempt (not just the winning one) — Instant Retry means a player
-- can submit several times a day. combo_id is denormalized from
-- daily_sprints so personal-best queries (which span repeats of the same
-- combo across different days) don't need a join, matching this codebase's
-- existing preference for flat client-side queries over joins.
create table sprint_attempts (
  id uuid primary key default gen_random_uuid(),
  daily_sprint_id uuid not null references daily_sprints(id) on delete cascade,
  combo_id uuid not null references sprint_combos(id),
  profile_id uuid not null references profiles(id) on delete cascade,
  duration_ms integer not null check (duration_ms > 0),
  is_pr boolean not null default false,
  is_crown boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_sprint_attempts_daily_sprint on sprint_attempts (daily_sprint_id);
create index idx_sprint_attempts_profile_combo on sprint_attempts (profile_id, combo_id, duration_ms);

-- Seed combo pool — 5-rep sequences built from real drills already in the
-- `drills` table (see hooks/useDailyChallenge.ts DRILL_IDS for the source
-- UUIDs). crown_threshold_ms values are starting guesses; tune once you
-- have real completion-time data.
insert into sprint_combos (name, drill_ids, reps, crown_threshold_ms) values
  ('V-Pull -> Scissor -> L-Turn',
   array['839ca238-1fa9-4703-a1dd-f679d08ddbb8','03e120d5-038c-4874-931d-4c7d74a19784','09159a88-da9c-4e09-a8a6-06da0f4a10cd']::uuid[],
   5, 16000),
  ('Cruyff -> V-Pull -> L-Turn',
   array['394606b5-278f-4efb-bfb3-63d41be90317','839ca238-1fa9-4703-a1dd-f679d08ddbb8','09159a88-da9c-4e09-a8a6-06da0f4a10cd']::uuid[],
   5, 15000),
  ('Maradona -> Scissor -> V-Pull',
   array['ffa79d48-51fc-437b-9460-50f32e981fee','03e120d5-038c-4874-931d-4c7d74a19784','839ca238-1fa9-4703-a1dd-f679d08ddbb8']::uuid[],
   5, 17000),
  ('Sole Roll -> Elastico -> Scissor',
   array['277316f0-8d14-47af-9c89-d14dff70f27d','ace4d7b2-fecd-461a-a40d-cdee90515205','03e120d5-038c-4874-931d-4c7d74a19784']::uuid[],
   5, 15500),
  ('Pull-Push -> Cruyff -> V-Pull',
   array['d97b8dd2-12c4-41e9-ac44-6936470c304f','394606b5-278f-4efb-bfb3-63d41be90317','839ca238-1fa9-4703-a1dd-f679d08ddbb8']::uuid[],
   5, 16500);

-- Note: the team leaderboard/pace aggregation (best-of-today + personal-best
-- per player + roster completion count) is done client-side in
-- hooks/useDailySprint.ts, matching this codebase's existing pattern of flat
-- Supabase .select() calls aggregated in JS rather than server-side SQL.

-- RLS — this project enables RLS by default on new public tables, which
-- with zero policies silently returns empty results to anon/authenticated
-- instead of erroring. Matches the rest of this codebase's client-trusted,
-- no-server-side-verification approach (no triggers validate duration_ms,
-- is_pr, or is_crown here either).
alter table sprint_combos enable row level security;
alter table daily_sprints enable row level security;
alter table sprint_attempts enable row level security;

create policy "sprint_combos_select" on sprint_combos for select using (true);
create policy "daily_sprints_select" on daily_sprints for select using (true);
create policy "daily_sprints_insert" on daily_sprints for insert with check (true);
create policy "sprint_attempts_select" on sprint_attempts for select using (true);
create policy "sprint_attempts_insert" on sprint_attempts for insert with check (true);
