-- Add repeat field to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_repeat BOOLEAN DEFAULT false;

-- Add index for repeat tasks
CREATE INDEX IF NOT EXISTS idx_tasks_is_repeat ON tasks(is_repeat) WHERE is_repeat = true;
