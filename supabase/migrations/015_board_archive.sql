-- Архивирование досок: доска живёт один учебный год.
--
-- Идея: не переносим данные в отдельные таблицы, а меняем состояние доски.
-- boards.archived_at is null  → доска активна, запись разрешена
-- boards.archived_at is not null → архив, только чтение (на уровне RLS, не UI)

-- ============================================================
-- 1. Схема
-- ============================================================

ALTER TABLE boards ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS school_year text;

-- Partial index: активных досок у пользователя единицы, архивных может быть много
CREATE INDEX IF NOT EXISTS boards_active_idx ON boards(user_id) WHERE archived_at IS NULL;

-- ============================================================
-- 2. Хелперы доступа
--
-- Заменяют девять почти одинаковых inline-подзапросов в политиках записи.
-- Проверка архива живёт в одном месте — забыть её в отдельной политике нельзя.
--
-- STABLE обязателен: без него Postgres считает функцию VOLATILE и вызывает
-- её для каждой строки, даже с теми же аргументами.
-- SECURITY DEFINER — чтобы не упереться в RLS вложенных таблиц (как в 004).
-- ============================================================

-- Владелец или редактор активной доски: задания и предметы
CREATE OR REPLACE FUNCTION board_is_editable_by(p_board_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM boards b
    WHERE b.id = p_board_id
      AND b.archived_at IS NULL
      AND (
        b.user_id = p_user_id
        OR EXISTS (
          SELECT 1 FROM board_members bm
          WHERE bm.board_id = b.id
            AND bm.user_id = p_user_id
            AND bm.role IN ('owner', 'editor')
        )
      )
  );
$$;

-- Только владелец активной доски: колонки, приглашения, участники
CREATE OR REPLACE FUNCTION board_is_manageable_by(p_board_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM boards b
    WHERE b.id = p_board_id
      AND b.archived_at IS NULL
      AND b.user_id = p_user_id
  );
$$;

-- Задания привязаны к колонке, а не к доске — разворачиваем связь здесь,
-- а не в каждой политике
CREATE OR REPLACE FUNCTION column_is_editable_by(p_column_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT board_is_editable_by(
    (SELECT c.board_id FROM columns c WHERE c.id = p_column_id),
    p_user_id
  );
$$;

-- Существующие хелперы объявлены без STABLE (по умолчанию VOLATILE) —
-- планировщик не может закэшировать результат в рамках запроса. Тела не меняем.
CREATE OR REPLACE FUNCTION user_has_board_access(p_board_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM boards WHERE id = p_board_id AND user_id = p_user_id)
      OR EXISTS (SELECT 1 FROM board_members WHERE board_id = p_board_id AND user_id = p_user_id);
$$;

CREATE OR REPLACE FUNCTION user_is_board_owner(p_board_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM boards WHERE id = p_board_id AND user_id = p_user_id);
$$;

-- ============================================================
-- 3. Политики записи
--
-- SELECT-политики НЕ трогаем: архив должен читаться всеми, у кого был доступ.
-- auth.uid() оборачиваем в (SELECT ...) — тогда он вычисляется один раз
-- как InitPlan, а не на каждую строку.
-- ============================================================

-- --- tasks: владелец + редактор -----------------------------
DROP POLICY IF EXISTS "Users can create tasks in their boards" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their boards" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their boards" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their and editable shared boards" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their and editable shared boards" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their and editable shared boards" ON tasks;

CREATE POLICY "Editable active boards: insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (column_is_editable_by(column_id, (SELECT auth.uid())));

CREATE POLICY "Editable active boards: update tasks"
  ON tasks FOR UPDATE
  USING (column_is_editable_by(column_id, (SELECT auth.uid())))
  WITH CHECK (column_is_editable_by(column_id, (SELECT auth.uid())));

CREATE POLICY "Editable active boards: delete tasks"
  ON tasks FOR DELETE
  USING (column_is_editable_by(column_id, (SELECT auth.uid())));

-- --- subjects: владелец + редактор --------------------------
DROP POLICY IF EXISTS "Users can create subjects in accessible boards" ON subjects;
DROP POLICY IF EXISTS "Users can update subjects in accessible boards" ON subjects;
DROP POLICY IF EXISTS "Users can delete subjects in accessible boards" ON subjects;

CREATE POLICY "Editable active boards: insert subjects"
  ON subjects FOR INSERT
  WITH CHECK (board_is_editable_by(board_id, (SELECT auth.uid())));

CREATE POLICY "Editable active boards: update subjects"
  ON subjects FOR UPDATE
  USING (board_is_editable_by(board_id, (SELECT auth.uid())))
  WITH CHECK (board_is_editable_by(board_id, (SELECT auth.uid())));

CREATE POLICY "Editable active boards: delete subjects"
  ON subjects FOR DELETE
  USING (board_is_editable_by(board_id, (SELECT auth.uid())));

-- --- columns: только владелец (как и было в 001) ------------
DROP POLICY IF EXISTS "Users can create columns in their boards" ON columns;
DROP POLICY IF EXISTS "Users can update columns in their boards" ON columns;
DROP POLICY IF EXISTS "Users can delete columns in their boards" ON columns;

CREATE POLICY "Owned active boards: insert columns"
  ON columns FOR INSERT
  WITH CHECK (board_is_manageable_by(board_id, (SELECT auth.uid())));

CREATE POLICY "Owned active boards: update columns"
  ON columns FOR UPDATE
  USING (board_is_manageable_by(board_id, (SELECT auth.uid())))
  WITH CHECK (board_is_manageable_by(board_id, (SELECT auth.uid())));

CREATE POLICY "Owned active boards: delete columns"
  ON columns FOR DELETE
  USING (board_is_manageable_by(board_id, (SELECT auth.uid())));

-- --- invites: в архивную доску не приглашаем ----------------
-- Была одна политика FOR ALL — разбиваем, чтобы закрыть только INSERT
DROP POLICY IF EXISTS "Board owners can manage invites" ON invites;

CREATE POLICY "Board owners can view invites"
  ON invites FOR SELECT
  USING (user_is_board_owner(board_id, (SELECT auth.uid())));

CREATE POLICY "Board owners can create invites"
  ON invites FOR INSERT
  WITH CHECK (board_is_manageable_by(board_id, (SELECT auth.uid())));

CREATE POLICY "Board owners can update invites"
  ON invites FOR UPDATE
  USING (user_is_board_owner(board_id, (SELECT auth.uid())));

CREATE POLICY "Board owners can delete invites"
  ON invites FOR DELETE
  USING (user_is_board_owner(board_id, (SELECT auth.uid())));

-- --- board_members ------------------------------------------
-- INSERT закрываем для архива. DELETE оставляем как есть:
-- участник должен иметь возможность покинуть даже архивную доску.
DROP POLICY IF EXISTS "Board owners can insert members" ON board_members;

CREATE POLICY "Board owners can insert members"
  ON board_members FOR INSERT
  WITH CHECK (board_is_manageable_by(board_id, (SELECT auth.uid())));

-- ============================================================
-- 4. accept_invite: нельзя присоединиться к архивной доске
-- ============================================================

CREATE OR REPLACE FUNCTION accept_invite(invite_code text)
RETURNS json AS $$
DECLARE
  v_invite public.invites%rowtype;
  v_member_id uuid;
BEGIN
  SELECT * INTO v_invite
  FROM public.invites
  WHERE code = invite_code
    AND expires_at > now()
    AND (max_uses IS NULL OR use_count < max_uses);

  IF v_invite IS NULL THEN
    RETURN json_build_object('error', 'Invalid or expired invite');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.boards
    WHERE id = v_invite.board_id AND archived_at IS NOT NULL
  ) THEN
    RETURN json_build_object('error', 'Board is archived');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = v_invite.board_id AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object('error', 'Already a member');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.boards
    WHERE id = v_invite.board_id AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object('error', 'You are the owner');
  END IF;

  INSERT INTO public.board_members (board_id, user_id, role)
  VALUES (v_invite.board_id, auth.uid(), v_invite.role)
  RETURNING id INTO v_member_id;

  UPDATE public.invites SET use_count = use_count + 1 WHERE id = v_invite.id;

  RETURN json_build_object('success', true, 'board_id', v_invite.board_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. Переход на новый учебный год
--
-- Шесть связанных вставок одной транзакцией: клиентскими запросами это
-- шесть шансов оставить наполовину созданную доску.
--
-- Словари старый_id → новый_id не нужны: колонки копируются с тем же
-- position, а на subjects есть уникальный индекс (board_id, name) — значит
-- соответствие восстанавливается обычным JOIN'ом.
-- ============================================================

CREATE OR REPLACE FUNCTION start_new_school_year(
  p_source_board_id  uuid,
  p_title            text,
  p_school_year      text    DEFAULT NULL,
  p_subject_ids      uuid[]  DEFAULT NULL,   -- NULL = перенести все предметы
  p_carry_over_tasks boolean DEFAULT false,
  p_copy_members     boolean DEFAULT true,
  p_archive_source   boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_new_board_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- SECURITY DEFINER обходит RLS, поэтому владельца проверяем руками
  IF NOT EXISTS (
    SELECT 1 FROM boards WHERE id = p_source_board_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Only the board owner can start a new school year';
  END IF;

  IF coalesce(btrim(p_title), '') = '' THEN
    RAISE EXCEPTION 'Board title is required';
  END IF;

  -- 1. Новая доска (owner_email проставит триггер из 006)
  INSERT INTO boards (user_id, title, school_year)
  VALUES (v_user_id, left(btrim(p_title), 100), nullif(btrim(p_school_year), ''))
  RETURNING id INTO v_new_board_id;

  -- 2. Колонки: position сохраняем — он же станет ключом переноса заданий
  INSERT INTO columns (board_id, title, position)
  SELECT v_new_board_id, c.title, c.position
  FROM columns c
  WHERE c.board_id = p_source_board_id;

  -- 3. Предметы: только выбранные пользователем
  INSERT INTO subjects (board_id, name, color)
  SELECT v_new_board_id, s.name, s.color
  FROM subjects s
  WHERE s.board_id = p_source_board_id
    AND (p_subject_ids IS NULL OR s.id = ANY(p_subject_ids));

  -- 4. Незавершённые задания.
  --    Дедлайны и completed_at намеренно не копируем: майский дедлайн на
  --    сентябрьской доске превращается в вечное «Просрочено 90 дн.».
  --    position = 2 — колонка «Готово» (то же соглашение, что в moveTask).
  IF p_carry_over_tasks THEN
    INSERT INTO tasks (column_id, subject_id, title, description, priority, position, is_repeat)
    SELECT nc.id, ns.id, t.title, t.description, t.priority, t.position, t.is_repeat
    FROM tasks t
    JOIN columns oc ON oc.id = t.column_id AND oc.board_id = p_source_board_id
    JOIN columns nc ON nc.board_id = v_new_board_id AND nc.position = oc.position
    LEFT JOIN subjects os ON os.id = t.subject_id
    LEFT JOIN subjects ns ON ns.board_id = v_new_board_id AND ns.name = os.name
    WHERE oc.position <> 2
      AND t.completed_at IS NULL;
  END IF;

  -- 5. Участники: родители не должны заново принимать приглашение
  IF p_copy_members THEN
    INSERT INTO board_members (board_id, user_id, role)
    SELECT v_new_board_id, bm.user_id, bm.role
    FROM board_members bm
    WHERE bm.board_id = p_source_board_id
    ON CONFLICT (board_id, user_id) DO NOTHING;
  END IF;

  -- 6. Архивируем исходную — последним шагом, чтобы политики выше не мешали
  IF p_archive_source THEN
    UPDATE boards SET archived_at = now() WHERE id = p_source_board_id;
  END IF;

  RETURN v_new_board_id;
END;
$$;
