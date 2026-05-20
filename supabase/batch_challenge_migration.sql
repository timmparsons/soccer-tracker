-- Add batch_id to link group challenges sent together
ALTER TABLE player_challenges ADD COLUMN IF NOT EXISTS batch_id UUID;
