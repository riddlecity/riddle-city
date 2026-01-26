-- Add color column to tracks table
ALTER TABLE tracks
ADD COLUMN color TEXT;

-- Set default colors for existing tracks based on mode
UPDATE tracks
SET color = 'pink'
WHERE mode = 'date';

UPDATE tracks
SET color = 'yellow'
WHERE mode = 'pubcrawl' OR mode = 'standard';
