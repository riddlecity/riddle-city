-- Add session_id column to group_members table to store the original Stripe session ID
-- This makes sense because only the group leader (who paid) has a session_id
-- Run this in your Supabase SQL console

ALTER TABLE group_members 
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_group_members_session_id 
ON group_members(session_id);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'group_members' 
AND column_name = 'session_id';
