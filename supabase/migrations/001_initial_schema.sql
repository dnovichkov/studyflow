-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create enum for task priority
create type priority as enum ('low', 'medium', 'high');

-- Create boards table
create table boards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create columns table
create table columns (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid references boards(id) on delete cascade not null,
  title text not null,
  position integer not null,
  created_at timestamptz default now() not null
);

-- Create subjects table
create table subjects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text,
  created_at timestamptz default now() not null
);

-- Create tasks table
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  column_id uuid references columns(id) on delete cascade not null,
  subject_id uuid references subjects(id) on delete set null,
  title text not null,
  description text,
  deadline timestamptz,
  priority priority default 'medium' not null,
  position integer not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create indexes
create index boards_user_id_idx on boards(user_id);
create index columns_board_id_idx on columns(board_id);
create index tasks_column_id_idx on tasks(column_id);
create index tasks_deadline_idx on tasks(deadline);
create index subjects_user_id_idx on subjects(user_id);

-- Enable Row Level Security
alter table boards enable row level security;
alter table columns enable row level security;
alter table tasks enable row level security;
alter table subjects enable row level security;

-- RLS Policies for boards
create policy "Users can view their own boards"
  on boards for select
  using (auth.uid() = user_id);

create policy "Users can create their own boards"
  on boards for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own boards"
  on boards for update
  using (auth.uid() = user_id);

create policy "Users can delete their own boards"
  on boards for delete
  using (auth.uid() = user_id);

-- RLS Policies for columns (through board ownership)
create policy "Users can view columns of their boards"
  on columns for select
  using (
    exists (
      select 1 from boards
      where boards.id = columns.board_id
      and boards.user_id = auth.uid()
    )
  );

create policy "Users can create columns in their boards"
  on columns for insert
  with check (
    exists (
      select 1 from boards
      where boards.id = columns.board_id
      and boards.user_id = auth.uid()
    )
  );

create policy "Users can update columns in their boards"
  on columns for update
  using (
    exists (
      select 1 from boards
      where boards.id = columns.board_id
      and boards.user_id = auth.uid()
    )
  );

create policy "Users can delete columns in their boards"
  on columns for delete
  using (
    exists (
      select 1 from boards
      where boards.id = columns.board_id
      and boards.user_id = auth.uid()
    )
  );

-- RLS Policies for tasks (through column -> board ownership)
create policy "Users can view tasks in their boards"
  on tasks for select
  using (
    exists (
      select 1 from columns
      join boards on boards.id = columns.board_id
      where columns.id = tasks.column_id
      and boards.user_id = auth.uid()
    )
  );

create policy "Users can create tasks in their boards"
  on tasks for insert
  with check (
    exists (
      select 1 from columns
      join boards on boards.id = columns.board_id
      where columns.id = tasks.column_id
      and boards.user_id = auth.uid()
    )
  );

create policy "Users can update tasks in their boards"
  on tasks for update
  using (
    exists (
      select 1 from columns
      join boards on boards.id = columns.board_id
      where columns.id = tasks.column_id
      and boards.user_id = auth.uid()
    )
  );

create policy "Users can delete tasks in their boards"
  on tasks for delete
  using (
    exists (
      select 1 from columns
      join boards on boards.id = columns.board_id
      where columns.id = tasks.column_id
      and boards.user_id = auth.uid()
    )
  );

-- RLS Policies for subjects
create policy "Users can view their own subjects"
  on subjects for select
  using (auth.uid() = user_id);

create policy "Users can create their own subjects"
  on subjects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own subjects"
  on subjects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own subjects"
  on subjects for delete
  using (auth.uid() = user_id);

-- Function to update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger boards_updated_at
  before update on boards
  for each row execute function update_updated_at();

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();
