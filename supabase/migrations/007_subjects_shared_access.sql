-- Allow users to view subjects of board owners they have access to
create policy "Users can view subjects of shared board owners"
  on subjects for select
  using (
    exists (
      select 1 from board_members bm
      join boards b on b.id = bm.board_id
      where bm.user_id = auth.uid()
      and b.user_id = subjects.user_id
    )
  );
