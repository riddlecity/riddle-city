-- Update all track pricing to £9.99
-- The price_per_person column stores the value in pence (smallest currency unit)
-- So £9.99 = 999 pence

-- Update all tracks to the new price of £9.99
UPDATE tracks 
SET price_per_person = 999;

-- Verify the update
SELECT id, location, mode, name, price_per_person 
FROM tracks 
ORDER BY location, mode;

-- Expected result: all tracks should show price_per_person = 999
