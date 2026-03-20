-- Add left_at column to group_members to track when players drop out
ALTER TABLE group_members
ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ DEFAULT NULL;

-- Players where left_at IS NULL are considered active members
