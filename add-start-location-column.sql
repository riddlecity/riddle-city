-- Add optional start_location column to riddles table
-- Use this for chained riddles where the starting point matters

ALTER TABLE riddles 
ADD COLUMN start_location TEXT DEFAULT NULL;

COMMENT ON COLUMN riddles.start_location IS 
'Optional starting location hint for chained riddles. Shown to users if they skipped the previous riddle. Example: "The Glassworks, Barnsley" or "Market Kitchen entrance"';

-- Index for faster queries (optional but recommended)
CREATE INDEX idx_riddles_start_location ON riddles(start_location) 
WHERE start_location IS NOT NULL;
