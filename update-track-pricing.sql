-- Update track pricing from £15.00 to £12.99
-- The price_per_person column stores the value in pence (smallest currency unit)
-- So £12.99 = 1299 pence

-- Update all tracks to the new price
UPDATE tracks 
SET price_per_person = 1299
WHERE price_per_person = 1500;

-- Verify the update
SELECT id, location, mode, name, price_per_person 
FROM tracks 
ORDER BY location, mode;
