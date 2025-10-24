-- Updated database schema to store opening hours directly in riddles table
-- Run this in your Supabase SQL console

-- Option 1: JSON column for flexible hours storage
ALTER TABLE riddles 
ADD COLUMN IF NOT EXISTS static_opening_hours JSONB;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_riddles_static_hours 
ON riddles USING GIN (static_opening_hours);

-- Example data structure for static_opening_hours:
-- {
--   "monday": {"open": "09:00", "close": "17:00"},
--   "tuesday": {"open": "09:00", "close": "17:00"},
--   "wednesday": {"open": "09:00", "close": "19:00"},
--   "thursday": {"open": "09:00", "close": "17:00"},
--   "friday": {"open": "09:00", "close": "17:00"},
--   "saturday": {"open": "09:30", "close": "16:00"},
--   "sunday": null
-- }

-- Example update for Central Library (closed Sundays):
-- UPDATE riddles 
-- SET static_opening_hours = '{
--   "monday": {"open": "09:00", "close": "17:00"},
--   "tuesday": {"open": "09:00", "close": "19:00"},
--   "wednesday": {"open": "09:00", "close": "17:00"},
--   "thursday": {"open": "09:00", "close": "17:00"},
--   "friday": {"open": "09:00", "close": "17:00"},
--   "saturday": {"open": "09:30", "close": "16:00"},
--   "sunday": null
-- }'
-- WHERE location_name = 'Central Library';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'riddles' 
AND column_name = 'static_opening_hours';