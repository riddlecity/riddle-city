-- Update all track pricing to £12.99
-- The price_per_person column stores the value in pence (smallest currency unit)
-- So £12.99 = 1299 pence

-- Update all tracks to the new price of £12.99
UPDATE tracks 
SET price_per_person = 1299;

-- Verify the update
SELECT id, location, mode, name, price_per_person 
FROM tracks 
ORDER BY location, mode;

-- Expected result: all tracks should show price_per_person = 1299
