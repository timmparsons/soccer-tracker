-- Clubs: organizations that group multiple teams
CREATE TABLE IF NOT EXISTS clubs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  join_code text NOT NULL UNIQUE,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Link teams to clubs
ALTER TABLE teams ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES clubs(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read clubs (needed for search + join by code)
CREATE POLICY "clubs_select" ON clubs FOR SELECT TO authenticated USING (true);

-- Any authenticated user can create a club
CREATE POLICY "clubs_insert" ON clubs FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Only the creator can update their club
CREATE POLICY "clubs_update" ON clubs FOR UPDATE TO authenticated USING (auth.uid() = created_by);
