-- Create board_members table for sharing
create table board_members (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid references boards(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz default now() not null,
  unique(board_id, user_id)
);

-- Create invites table
create table invites (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid references boards(id) on delete cascade not null,
  code text unique not null,
  role text not null default 'viewer' check (role in ('editor', 'viewer')),
  created_by uuid references auth.users(id) on delete cascade not null,
  expires_at timestamptz not null,
  max_uses integer default 1,
  use_count integer default 0,
  created_at timestamptz default now() not null
);

-- Create indexes
create index board_members_board_id_idx on board_members(board_id);
create index board_members_user_id_idx on board_members(user_id);
create index invites_code_idx on invites(code);
create index invites_board_id_idx on invites(board_id);

-- Enable RLS
alter table board_members enable row level security;
alter table invites enable row level security;

-- RLS for board_members
create policy "Users can view board members of boards they belong to"
  on board_members for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from board_members bm
      where bm.board_id = board_members.board_id
      and bm.user_id = auth.uid()
    )
  );

create policy "Board owners can manage members"
  on board_members for all
  using (
    exists (
      select 1 from boards
      where boards.id = board_members.board_id
      and boards.user_id = auth.uid()
    )
  );

-- RLS for invites
create policy "Board owners can manage invites"
  on invites for all
  using (
    exists (
      select 1 from boards
      where boards.id = invites.board_id
      and boards.user_id = auth.uid()
    )
  );

create policy "Anyone can view valid invites by code"
  on invites for select
  using (
    expires_at > now() and
    (max_uses is null or use_count < max_uses)
  );

-- Update boards RLS to include shared boards
drop policy if exists "Users can view their own boards" on boards;
create policy "Users can view their own and shared boards"
  on boards for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from board_members
      where board_members.board_id = boards.id
      and board_members.user_id = auth.uid()
    )
  );

-- Update columns RLS to include shared boards
drop policy if exists "Users can view columns of their boards" on columns;
create policy "Users can view columns of their and shared boards"
  on columns for select
  using (
    exists (
      select 1 from boards
      where boards.id = columns.board_id
      and (
        boards.user_id = auth.uid() or
        exists (
          select 1 from board_members
          where board_members.board_id = boards.id
          and board_members.user_id = auth.uid()
        )
      )
    )
  );

-- Update tasks RLS to include shared boards
drop policy if exists "Users can view tasks in their boards" on tasks;
create policy "Users can view tasks in their and shared boards"
  on tasks for select
  using (
    exists (
      select 1 from columns
      join boards on boards.id = columns.board_id
      where columns.id = tasks.column_id
      and (
        boards.user_id = auth.uid() or
        exists (
          select 1 from board_members
          where board_members.board_id = boards.id
          and board_members.user_id = auth.uid()
        )
      )
    )
  );

-- Allow editors to modify tasks
drop policy if exists "Users can create tasks in their boards" on tasks;
create policy "Users can create tasks in their and editable shared boards"
  on tasks for insert
  with check (
    exists (
      select 1 from columns
      join boards on boards.id = columns.board_id
      where columns.id = tasks.column_id
      and (
        boards.user_id = auth.uid() or
        exists (
          select 1 from board_members
          where board_members.board_id = boards.id
          and board_members.user_id = auth.uid()
          and board_members.role in ('owner', 'editor')
        )
      )
    )
  );

drop policy if exists "Users can update tasks in their boards" on tasks;
create policy "Users can update tasks in their and editable shared boards"
  on tasks for update
  using (
    exists (
      select 1 from columns
      join boards on boards.id = columns.board_id
      where columns.id = tasks.column_id
      and (
        boards.user_id = auth.uid() or
        exists (
          select 1 from board_members
          where board_members.board_id = boards.id
          and board_members.user_id = auth.uid()
          and board_members.role in ('owner', 'editor')
        )
      )
    )
  );

drop policy if exists "Users can delete tasks in their boards" on tasks;
create policy "Users can delete tasks in their and editable shared boards"
  on tasks for delete
  using (
    exists (
      select 1 from columns
      join boards on boards.id = columns.board_id
      where columns.id = tasks.column_id
      and (
        boards.user_id = auth.uid() or
        exists (
          select 1 from board_members
          where board_members.board_id = boards.id
          and board_members.user_id = auth.uid()
          and board_members.role in ('owner', 'editor')
        )
      )
    )
  );

-- Function to accept invite
create or replace function accept_invite(invite_code text)
returns json as $$
declare
  v_invite invites%rowtype;
  v_member_id uuid;
begin
  -- Find valid invite
  select * into v_invite
  from invites
  where code = invite_code
  and expires_at > now()
  and (max_uses is null or use_count < max_uses);

  if v_invite is null then
    return json_build_object('error', 'Invalid or expired invite');
  end if;

  -- Check if user is already a member
  if exists (
    select 1 from board_members
    where board_id = v_invite.board_id
    and user_id = auth.uid()
  ) then
    return json_build_object('error', 'Already a member');
  end if;

  -- Check if user is the owner
  if exists (
    select 1 from boards
    where id = v_invite.board_id
    and user_id = auth.uid()
  ) then
    return json_build_object('error', 'You are the owner');
  end if;

  -- Add user as member
  insert into board_members (board_id, user_id, role)
  values (v_invite.board_id, auth.uid(), v_invite.role)
  returning id into v_member_id;

  -- Increment use count
  update invites
  set use_count = use_count + 1
  where id = v_invite.id;

  return json_build_object('success', true, 'board_id', v_invite.board_id);
end;
$$ language plpgsql security definer;

-- Enable realtime for tasks
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table columns;
