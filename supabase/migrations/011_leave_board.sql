-- Allow users to delete their own board membership (leave a board)
CREATE POLICY "Users can leave boards"
  ON board_members FOR DELETE
  USING (user_id = auth.uid());
