-- Weekly training goal: how many days per week (Sun–Sat) the player aims to
-- train. Complements the daily streak so a rest day doesn't feel like failure.
alter table public.user_targets
  add column weekly_goal_days smallint not null default 4
  check (weekly_goal_days between 1 and 7);
