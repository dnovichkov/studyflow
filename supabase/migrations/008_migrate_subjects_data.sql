-- DATA MIGRATION SCRIPT
-- Run this AFTER applying 008_subjects_board_id.sql migration
-- This script migrates existing subjects from user_id to board_id

-- For each subject, find the user's first board and assign subject to it
UPDATE subjects s
SET board_id = (
  SELECT b.id
  FROM boards b
  WHERE b.user_id = s.user_id
  ORDER BY b.created_at ASC
  LIMIT 1
)
WHERE s.board_id IS NULL AND s.user_id IS NOT NULL;

-- Verify migration
-- SELECT COUNT(*) as migrated FROM subjects WHERE board_id IS NOT NULL;
-- SELECT COUNT(*) as not_migrated FROM subjects WHERE board_id IS NULL;

-- Optional: Delete orphaned subjects (subjects without a board)
-- DELETE FROM subjects WHERE board_id IS NULL;
