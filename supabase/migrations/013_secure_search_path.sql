-- Secure SECURITY DEFINER functions against search_path injection
-- See: https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY

-- Fix user_has_board_access
CREATE OR REPLACE FUNCTION user_has_board_access(p_board_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.boards WHERE id = p_board_id AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.board_members WHERE board_id = p_board_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix user_is_board_owner
CREATE OR REPLACE FUNCTION user_is_board_owner(p_board_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.boards WHERE id = p_board_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix accept_invite
CREATE OR REPLACE FUNCTION accept_invite(invite_code text)
RETURNS json AS $$
DECLARE
  v_invite public.invites%rowtype;
  v_member_id uuid;
BEGIN
  -- Find valid invite
  SELECT * INTO v_invite
  FROM public.invites
  WHERE code = invite_code
  AND expires_at > now()
  AND (max_uses IS NULL OR use_count < max_uses);

  IF v_invite IS NULL THEN
    RETURN json_build_object('error', 'Invalid or expired invite');
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = v_invite.board_id
    AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object('error', 'Already a member');
  END IF;

  -- Check if user is the owner
  IF EXISTS (
    SELECT 1 FROM public.boards
    WHERE id = v_invite.board_id
    AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object('error', 'You are the owner');
  END IF;

  -- Add user as member
  INSERT INTO public.board_members (board_id, user_id, role)
  VALUES (v_invite.board_id, auth.uid(), v_invite.role)
  RETURNING id INTO v_member_id;

  -- Increment use count
  UPDATE public.invites
  SET use_count = use_count + 1
  WHERE id = v_invite.id;

  RETURN json_build_object('success', true, 'board_id', v_invite.board_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
