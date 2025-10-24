-- SQL commands to add opening hours to riddles table
-- Run these in your Supabase SQL console

-- 1. Add the opening_hours column as JSONB
ALTER TABLE riddles 
ADD COLUMN IF NOT EXISTS opening_hours JSONB;

-- 2. Add index for faster queries on opening hours
CREATE INDEX IF NOT EXISTS idx_riddles_opening_hours 
ON riddles USING GIN (opening_hours);

-- 3. Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'riddles' 
AND column_name = 'opening_hours';

-- 4. Example: Add hours for Central Library (closed Sundays)
-- UPDATE riddles 
-- SET opening_hours = '{
--   "monday": {"open": "09:00", "close": "17:00"},
--   "tuesday": {"open": "09:00", "close": "19:00"},
--   "wednesday": {"open": "09:00", "close": "17:00"},
--   "thursday": {"open": "09:00", "close": "17:00"},
--   "friday": {"open": "09:00", "close": "17:00"},
--   "saturday": {"open": "09:30", "close": "16:00"},
--   "sunday": null
-- }'::jsonb
-- WHERE location_id = 'Central Library';

-- 5. Example: Add hours for Superbowl (open late)
-- UPDATE riddles 
-- SET opening_hours = '{
--   "monday": {"open": "09:00", "close": "23:00"},
--   "tuesday": {"open": "09:00", "close": "23:00"},
--   "wednesday": {"open": "09:00", "close": "23:00"},
--   "thursday": {"open": "09:00", "close": "23:00"},
--   "friday": {"open": "09:00", "close": "23:00"},
--   "saturday": {"open": "09:00", "close": "23:00"},
--   "sunday": {"open": "09:00", "close": "23:00"}
-- }'::jsonb
-- WHERE location_id = 'Superbowl';

-- 6. Query to see all riddles and their opening hours
SELECT id, location_id, opening_hours 
FROM riddles 
ORDER BY order_index;