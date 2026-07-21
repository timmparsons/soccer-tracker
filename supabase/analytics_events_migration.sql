-- Feature usage analytics: write-only event log from the app.
-- Query from the Supabase dashboard (SQL editor) — no client select access.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event text not null,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "users can insert own events"
  on public.events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create index events_event_created_idx on public.events (event, created_at desc);
create index events_user_idx on public.events (user_id);
