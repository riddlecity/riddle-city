-- Add the new columns to the riddles table for caching opening hours
-- Run this in your Supabase SQL console

ALTER TABLE riddles 
ADD COLUMN IF NOT EXISTS opening_hours JSONB,
ADD COLUMN IF NOT EXISTS hours_last_updated TIMESTAMP;

-- Add an index for faster lookups on the hours_last_updated column
CREATE INDEX IF NOT EXISTS idx_riddles_hours_last_updated 
ON riddles(hours_last_updated);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'riddles' 
AND column_name IN ('opening_hours', 'hours_last_updated');
