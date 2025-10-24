-- SQL UPDATE statements for all riddle opening hours
-- Run these in your Supabase SQL console

-- 1. Superbowl (barnsley_r1)
UPDATE riddles 
SET opening_hours = '{
  "monday": {"open": "09:00", "close": "23:00"},
  "tuesday": {"open": "09:00", "close": "23:00"},
  "wednesday": {"open": "09:00", "close": "23:00"},
  "thursday": {"open": "09:00", "close": "23:00"},
  "friday": {"open": "09:00", "close": "00:00"},
  "saturday": {"open": "09:00", "close": "00:00"},
  "sunday": {"open": "09:00", "close": "23:00"}
}'::jsonb
WHERE location_id = 'Superbowl';

-- 2. Central Library (barnsley_r2) - CLOSED SUNDAYS
UPDATE riddles 
SET opening_hours = '{
  "monday": {"open": "09:00", "close": "19:00"},
  "tuesday": {"open": "09:00", "close": "17:00"},
  "wednesday": {"open": "09:00", "close": "19:00"},
  "thursday": {"open": "09:00", "close": "17:00"},
  "friday": {"open": "09:00", "close": "17:00"},
  "saturday": {"open": "09:30", "close": "16:00"},
  "sunday": null
}'::jsonb
WHERE location_id = 'library';

-- 3. Falco Lounge (barnsley_r3)
UPDATE riddles 
SET opening_hours = '{
  "monday": {"open": "09:00", "close": "22:00"},
  "tuesday": {"open": "09:00", "close": "22:00"},
  "wednesday": {"open": "09:00", "close": "22:00"},
  "thursday": {"open": "09:00", "close": "22:00"},
  "friday": {"open": "09:00", "close": "23:00"},
  "saturday": {"open": "09:00", "close": "23:00"},
  "sunday": {"open": "09:00", "close": "22:00"}
}'::jsonb
WHERE location_id = 'Falco_lounge';

-- 4. 200 Degrees (barnsley_r4)
UPDATE riddles 
SET opening_hours = '{
  "monday": {"open": "07:00", "close": "18:00"},
  "tuesday": {"open": "07:00", "close": "18:00"},
  "wednesday": {"open": "07:00", "close": "18:00"},
  "thursday": {"open": "07:00", "close": "18:00"},
  "friday": {"open": "07:00", "close": "18:00"},
  "saturday": {"open": "07:00", "close": "18:00"},
  "sunday": {"open": "08:30", "close": "16:30"}
}'::jsonb
WHERE location_id = '200degrees';

-- 5. Red Robot (barnsley_r5) - CLOSED SUNDAY & MONDAY
UPDATE riddles 
SET opening_hours = '{
  "monday": null,
  "tuesday": {"open": "10:00", "close": "17:00"},
  "wednesday": {"open": "10:00", "close": "17:00"},
  "thursday": {"open": "10:00", "close": "17:00"},
  "friday": {"open": "10:00", "close": "17:00"},
  "saturday": {"open": "10:00", "close": "17:00"},
  "sunday": null
}'::jsonb
WHERE location_id = 'redrobot';

-- 6. Spiral City (barnsley_r6) - CLOSED MONDAY
UPDATE riddles 
SET opening_hours = '{
  "monday": null,
  "tuesday": {"open": "12:00", "close": "22:30"},
  "wednesday": {"open": "12:00", "close": "23:30"},
  "thursday": {"open": "12:00", "close": "23:30"},
  "friday": {"open": "11:00", "close": "23:30"},
  "saturday": {"open": "11:00", "close": "00:30"},
  "sunday": {"open": "12:00", "close": "21:00"}
}'::jsonb
WHERE location_id = 'Spiral_city';

-- 7. Verify all updates
SELECT id, location_id, opening_hours 
FROM riddles 
WHERE opening_hours IS NOT NULL
ORDER BY id;