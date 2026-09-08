-- profiles.expo_push_token only ever holds the most recently signed-in
-- device's token, so a second device signing into the same account (e.g. a
-- parent borrowing a kid's session, or vice versa) silently overwrites it and
-- kills push delivery to the other device. This table supports many tokens
-- per user.
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  updated_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

create policy "Users manage own push tokens"
  on public.push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Dedupe guards for the daily-streak-check cron job, so a rerun (or a job
-- that fires more than once for the same day) doesn't send duplicate pushes.
alter table public.profiles
  add column last_reminder_notified_at date,
  add column last_freeze_notified_at date;
