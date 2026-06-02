-- Timed challenge columns on daily_sessions
alter table daily_sessions
  add column if not exists is_timed_challenge boolean default false,
  add column if not exists challenge_duration_seconds integer;

-- Index for efficient leaderboard queries
create index if not exists idx_daily_sessions_timed
  on daily_sessions (is_timed_challenge, challenge_duration_seconds, date)
  where is_timed_challenge = true;
