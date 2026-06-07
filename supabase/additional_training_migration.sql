create table if not exists additional_training_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  category text not null,
  duration_minutes integer not null,
  xp_awarded integer not null,
  completed_at timestamptz default now() not null
);

create index if not exists idx_additional_training_user_date
  on additional_training_sessions (user_id, completed_at);

alter table additional_training_sessions enable row level security;

create policy "users can manage own additional training sessions"
  on additional_training_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
