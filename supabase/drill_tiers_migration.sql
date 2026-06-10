-- Drill performance tier thresholds
-- Tier badges: drill_{tier}_{drill_id}
-- Thresholds for 100 touches — add rows for 200/300/500 targets as needed

create table if not exists drill_tiers (
  id uuid primary key default gen_random_uuid(),
  drill_id uuid references drills(id) on delete cascade,
  touches_target int not null,
  tier text not null check (tier in ('bronze', 'silver', 'gold', 'master')),
  threshold_seconds float not null,
  created_at timestamptz default now(),
  unique(drill_id, touches_target, tier)
);

alter table drill_tiers enable row level security;

create policy "anyone can read drill tiers"
  on drill_tiers for select using (true);

-- Seed thresholds (100 touches).
-- Times based on competitive youth player benchmarks.
-- Adjust via Supabase dashboard — no app update needed.

insert into drill_tiers (drill_id, touches_target, tier, threshold_seconds)
select d.id, 100, unnested.tier, unnested.secs
from drills d,
  (values
    ('bronze', 75.0),
    ('silver', 55.0),
    ('gold',   40.0),
    ('master', 28.0)
  ) as unnested(tier, secs)
where d.name = 'Foundations'
on conflict do nothing;

insert into drill_tiers (drill_id, touches_target, tier, threshold_seconds)
select d.id, 100, unnested.tier, unnested.secs
from drills d,
  (values
    ('bronze', 65.0),
    ('silver', 48.0),
    ('gold',   36.0),
    ('master', 26.0)
  ) as unnested(tier, secs)
where d.name = 'Bell Touches'
on conflict do nothing;

insert into drill_tiers (drill_id, touches_target, tier, threshold_seconds)
select d.id, 100, unnested.tier, unnested.secs
from drills d,
  (values
    ('bronze', 80.0),
    ('silver', 60.0),
    ('gold',   45.0),
    ('master', 32.0)
  ) as unnested(tier, secs)
where d.name = 'Sole Rolls'
on conflict do nothing;

insert into drill_tiers (drill_id, touches_target, tier, threshold_seconds)
select d.id, 100, unnested.tier, unnested.secs
from drills d,
  (values
    ('bronze', 55.0),
    ('silver', 40.0),
    ('gold',   30.0),
    ('master', 22.0)
  ) as unnested(tier, secs)
where d.name = 'Toe Taps'
on conflict do nothing;

insert into drill_tiers (drill_id, touches_target, tier, threshold_seconds)
select d.id, 100, unnested.tier, unnested.secs
from drills d,
  (values
    ('bronze', 70.0),
    ('silver', 52.0),
    ('gold',   38.0),
    ('master', 28.0)
  ) as unnested(tier, secs)
where d.name = 'Pull Push'
on conflict do nothing;

insert into drill_tiers (drill_id, touches_target, tier, threshold_seconds)
select d.id, 100, unnested.tier, unnested.secs
from drills d,
  (values
    ('bronze', 80.0),
    ('silver', 60.0),
    ('gold',   45.0),
    ('master', 32.0)
  ) as unnested(tier, secs)
where d.name = 'V Pull'
on conflict do nothing;

insert into drill_tiers (drill_id, touches_target, tier, threshold_seconds)
select d.id, 100, unnested.tier, unnested.secs
from drills d,
  (values
    ('bronze', 90.0),
    ('silver', 65.0),
    ('gold',   50.0),
    ('master', 35.0)
  ) as unnested(tier, secs)
where d.name = 'Drag Back'
on conflict do nothing;

insert into drill_tiers (drill_id, touches_target, tier, threshold_seconds)
select d.id, 100, unnested.tier, unnested.secs
from drills d,
  (values
    ('bronze', 90.0),
    ('silver', 70.0),
    ('gold',   54.0),
    ('master', 40.0)
  ) as unnested(tier, secs)
where d.name = 'Scissors'
on conflict do nothing;

insert into drill_tiers (drill_id, touches_target, tier, threshold_seconds)
select d.id, 100, unnested.tier, unnested.secs
from drills d,
  (values
    ('bronze', 95.0),
    ('silver', 72.0),
    ('gold',   55.0),
    ('master', 42.0)
  ) as unnested(tier, secs)
where d.name = 'Stepovers'
on conflict do nothing;

insert into drill_tiers (drill_id, touches_target, tier, threshold_seconds)
select d.id, 100, unnested.tier, unnested.secs
from drills d,
  (values
    ('bronze', 100.0),
    ('silver', 75.0),
    ('gold',    58.0),
    ('master',  44.0)
  ) as unnested(tier, secs)
where d.name = 'Elastico'
on conflict do nothing;
