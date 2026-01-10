-- Fix infinite recursion in RLS policies

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view board members of boards they belong to" ON board_members;
DROP POLICY IF EXISTS "Board owners can manage members" ON board_members;
DROP POLICY IF EXISTS "Users can view their own and shared boards" ON boards;

-- Create helper function to check board access (bypasses RLS)
CREATE OR REPLACE FUNCTION user_has_board_access(p_board_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM boards WHERE id = p_board_id AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM board_members WHERE board_id = p_board_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is board owner
CREATE OR REPLACE FUNCTION user_is_board_owner(p_board_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM boards WHERE id = p_board_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fixed policy for boards: Users can view their own and shared boards
CREATE POLICY "Users can view their own and shared boards"
  ON boards FOR SELECT
  USING (
    auth.uid() = user_id OR
    user_has_board_access(id, auth.uid())
  );

-- Fixed policy for board_members: Simple direct check without self-reference
CREATE POLICY "Users can view board members"
  ON board_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    user_is_board_owner(board_id, auth.uid())
  );

CREATE POLICY "Board owners can insert members"
  ON board_members FOR INSERT
  WITH CHECK (
    user_is_board_owner(board_id, auth.uid())
  );

CREATE POLICY "Board owners can update members"
  ON board_members FOR UPDATE
  USING (
    user_is_board_owner(board_id, auth.uid())
  );

CREATE POLICY "Board owners can delete members"
  ON board_members FOR DELETE
  USING (
    user_is_board_owner(board_id, auth.uid())
  );
