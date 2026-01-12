-- Add owner_email to boards for display purposes
alter table boards add column owner_email text;

-- Create function to get user email
create or replace function get_user_email(user_uuid uuid)
returns text
language sql
security definer
as $$
  select email from auth.users where id = user_uuid;
$$;

-- Update existing boards with owner email
update boards set owner_email = get_user_email(user_id);

-- Create trigger to auto-set owner_email on insert
create or replace function set_board_owner_email()
returns trigger
language plpgsql
security definer
as $$
begin
  new.owner_email := get_user_email(new.user_id);
  return new;
end;
$$;

create trigger boards_set_owner_email
  before insert on boards
  for each row
  execute function set_board_owner_email();
