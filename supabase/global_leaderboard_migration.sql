-- Add global leaderboard opt-in fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_on_global_leaderboard boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hometown_city text,
  ADD COLUMN IF NOT EXISTS hometown_state text DEFAULT 'AZ';
