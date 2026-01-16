-- Migration: Attach subjects to boards instead of users
-- This prevents subject duplication when sharing boards

-- Add board_id column to subjects
ALTER TABLE subjects ADD COLUMN board_id uuid REFERENCES boards(id) ON DELETE CASCADE;

-- Make user_id nullable (for backward compatibility during migration)
ALTER TABLE subjects ALTER COLUMN user_id DROP NOT NULL;

-- Create index for board_id
CREATE INDEX subjects_board_id_idx ON subjects(board_id);

-- Drop old RLS policies for subjects
DROP POLICY IF EXISTS "Users can view their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can create their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can update their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can delete their own subjects" ON subjects;
DROP POLICY IF EXISTS "Users can view subjects of shared board owners" ON subjects;

-- New RLS policies based on board_id

-- SELECT: Users can view subjects of boards they own or have access to
CREATE POLICY "Users can view subjects of accessible boards"
  ON subjects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = subjects.board_id
      AND (
        b.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
        )
      )
    )
  );

-- INSERT: Owners and editors can create subjects
CREATE POLICY "Users can create subjects in accessible boards"
  ON subjects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = subjects.board_id
      AND (
        b.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
          AND bm.role IN ('owner', 'editor')
        )
      )
    )
  );

-- UPDATE: Owners and editors can update subjects
CREATE POLICY "Users can update subjects in accessible boards"
  ON subjects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = subjects.board_id
      AND (
        b.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
          AND bm.role IN ('owner', 'editor')
        )
      )
    )
  );

-- DELETE: Owners and editors can delete subjects
CREATE POLICY "Users can delete subjects in accessible boards"
  ON subjects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = subjects.board_id
      AND (
        b.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
          AND bm.user_id = auth.uid()
          AND bm.role IN ('owner', 'editor')
        )
      )
    )
  );
