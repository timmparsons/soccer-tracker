-- Add is_admin flag to profiles
alter table profiles add column if not exists is_admin boolean default false;

-- Set your account as admin:
-- update profiles set is_admin = true where id = 'YOUR_USER_ID';

-- If your RLS policies restrict reading all teams/profiles to the coach_id only,
-- add policies to allow admins to read everything:
--
-- create policy "Admins can read all teams"
--   on teams for select
--   using (
--     exists (
--       select 1 from profiles where id = auth.uid() and is_admin = true
--     )
--   );
--
-- create policy "Admins can read all profiles"
--   on profiles for select
--   using (
--     exists (
--       select 1 from profiles where id = auth.uid() and is_admin = true
--     )
--   );
