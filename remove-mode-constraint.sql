-- Remove the mode check constraint to allow any mode value
ALTER TABLE tracks
DROP CONSTRAINT IF EXISTS tracks_mode_check;

-- Now you can use any mode value you want (pub, pubcrawl, date, merrymen, etc.)
