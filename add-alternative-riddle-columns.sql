-- Add alternative riddle support to riddles table
-- This allows riddles to have an optional alternative if the primary clue is unavailable

ALTER TABLE riddles 
ADD COLUMN IF NOT EXISTS alt_message TEXT,
ADD COLUMN IF NOT EXISTS alt_riddle TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN riddles.alt_message IS 'Message shown to user offering an alternative riddle (e.g., "If the Duke is asleep click here for an alternative riddle")';
COMMENT ON COLUMN riddles.alt_riddle IS 'Alternative riddle text shown when user clicks the alt_message link';

-- Verify the columns were added
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'riddles' 
AND column_name IN ('alt_message', 'alt_riddle');
