-- Add completed_at field to tasks
-- Used to calculate overdue status relative to completion time, not current time
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON public.tasks(completed_at) WHERE completed_at IS NOT NULL;

-- Backfill: For existing tasks in "Готово" columns, set completed_at to updated_at
UPDATE public.tasks
SET completed_at = updated_at
WHERE column_id IN (
  SELECT c.id FROM public.columns c WHERE c.title = 'Готово'
)
AND completed_at IS NULL;
