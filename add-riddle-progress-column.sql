-- Add riddle_progress column to groups table
-- This tracks completion details for each riddle in a group

ALTER TABLE groups 
ADD COLUMN riddle_progress JSONB DEFAULT '{}'::jsonb;

-- Add a comment explaining the structure
COMMENT ON COLUMN groups.riddle_progress IS 'Tracks completion data for each riddle. Structure: {"1": {"type": "scan"|"skip"|"manual_answer", "time": "ISO timestamp"}}';

-- Create an index for better query performance
CREATE INDEX idx_groups_riddle_progress ON groups USING GIN (riddle_progress);
