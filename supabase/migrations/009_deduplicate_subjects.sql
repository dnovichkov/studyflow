-- Migration: Remove duplicate subjects within boards
-- Duplicates appeared because the data migration (008) assigned all user subjects
-- to their first board, potentially doubling up with already-existing subjects.

-- Step 1: Reassign tasks from duplicate subjects to the kept subject.
-- We keep the earliest-created subject per (board_id, name) group using DISTINCT ON.
UPDATE tasks t
SET subject_id = keeper.keep_id
FROM (
  SELECT s.id AS dup_id, keepers.keep_id
  FROM subjects s
  JOIN (
    SELECT DISTINCT ON (board_id, name) id AS keep_id, board_id, name
    FROM subjects
    WHERE board_id IS NOT NULL
    ORDER BY board_id, name, created_at ASC
  ) keepers ON s.board_id = keepers.board_id
          AND s.name = keepers.name
          AND s.id != keepers.keep_id
) keeper
WHERE t.subject_id = keeper.dup_id;

-- Step 2: Delete duplicate subjects (all except the kept one per group)
DELETE FROM subjects s
USING (
  SELECT DISTINCT ON (board_id, name) id AS keep_id, board_id, name
  FROM subjects
  WHERE board_id IS NOT NULL
  ORDER BY board_id, name, created_at ASC
) keepers
WHERE s.board_id = keepers.board_id
  AND s.name = keepers.name
  AND s.id != keepers.keep_id;

-- Step 3: Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX subjects_board_id_name_unique ON subjects(board_id, name);
