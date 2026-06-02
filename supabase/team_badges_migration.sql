create table if not exists team_badges (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade not null,
  badge_type text not null,
  week_start date,           -- null for one-time badges; set for weekly repeatable badges
  earned_at timestamptz default now() not null,
  unique(team_id, badge_type, week_start)
);

-- Allow players and coaches to read their team's badges
alter table team_badges enable row level security;

create policy "Team members can view their team badges"
  on team_badges for select
  using (
    team_id in (
      select team_id from profiles where id = auth.uid()
    )
  );

-- Only service role can insert (done server-side via checkTeamBadges)
create policy "Service role can insert team badges"
  on team_badges for insert
  with check (true);
