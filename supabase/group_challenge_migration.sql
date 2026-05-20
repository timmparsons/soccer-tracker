-- N-way group competitions
CREATE TABLE IF NOT EXISTS group_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES profiles(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  touches_target INT NOT NULL,
  time_limit_hours INT NOT NULL,
  deadline_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_challenge_id UUID NOT NULL REFERENCES group_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  time_seconds INT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_challenge_id, user_id)
);
