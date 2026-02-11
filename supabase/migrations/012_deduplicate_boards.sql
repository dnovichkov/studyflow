-- Delete duplicate boards per user, keeping the oldest one.
-- Columns and tasks cascade-delete automatically.
WITH boards_to_keep AS (
  SELECT DISTINCT ON (user_id) id
  FROM boards
  ORDER BY user_id, created_at ASC
)
DELETE FROM boards
WHERE id NOT IN (SELECT id FROM boards_to_keep);
