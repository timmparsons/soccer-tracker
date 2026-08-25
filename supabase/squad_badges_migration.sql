-- Squad Badges: team-level achievements, starting with "everyone on the
-- roster completed today's Daily Sprint." Each row in squad_badges is one
-- earned instance (not a catalog entry like `badges`/`user_badges`, which
-- separate definition from award) — the badge's name/icon/goal are picked
-- client-side from a rotating pool (see lib/squadBadges.ts) at the moment
-- the team earns it, and stamped onto the row directly.

create table squad_badges (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  badge_name text not null,
  badge_icon text not null,
  goal_type text not null,
  target_count smallint not null,
  achieved_at timestamptz not null default now()
);

-- Players who were credited toward the team hitting target_count when this
-- badge was earned (e.g. everyone who completed that day's sprint).
create table user_squad_badges (
  id uuid primary key default gen_random_uuid(),
  squad_badge_id uuid not null references squad_badges(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (squad_badge_id, profile_id)
);

create index idx_squad_badges_team on squad_badges (team_id, achieved_at desc);
create index idx_user_squad_badges_profile on user_squad_badges (profile_id, created_at desc);

-- RLS — same client-trusted, no-server-side-verification approach as
-- daily_sprint_migration.sql. Idempotency (one squad badge per team per
-- goal per day) is enforced client-side in lib/checkSquadBadges.ts by
-- checking for an existing row before inserting, not by a DB constraint.
alter table squad_badges enable row level security;
alter table user_squad_badges enable row level security;

create policy "squad_badges_select" on squad_badges for select using (true);
create policy "squad_badges_insert" on squad_badges for insert with check (true);
create policy "user_squad_badges_select" on user_squad_badges for select using (true);
create policy "user_squad_badges_insert" on user_squad_badges for insert with check (true);
