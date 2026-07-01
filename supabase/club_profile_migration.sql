-- Link players and coaches directly to a club (no team traversal needed)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES clubs(id) ON DELETE SET NULL;
