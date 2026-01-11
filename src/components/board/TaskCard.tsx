import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/card'
import type { Task, Subject } from '@/types'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/types'
import { cn } from '@/lib/utils'

interface TaskCardProps {
  task: Task
  subject?: Subject
  onClick?: () => void
}

export function TaskCard({ task, subject, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  }

  const isOverdue = task.deadline && new Date(task.deadline) < new Date()

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'p-3 cursor-grab active:cursor-grabbing select-none',
        isDragging && 'opacity-50 shadow-lg',
        isOverdue && 'border-destructive'
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight">{task.title}</p>
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded shrink-0',
              PRIORITY_COLORS[task.priority]
            )}
          >
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {subject && (
            <span
              className="px-1.5 py-0.5 rounded"
              style={{ backgroundColor: subject.color || '#e5e7eb' }}
            >
              {subject.name}
            </span>
          )}
          {task.deadline && (
            <span className={cn(isOverdue && 'text-destructive font-medium')}>
              {formatDeadline(task.deadline)}
            </span>
          )}
          {task.isRepeat && (
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" title="Повторяемое задание">
              ↻
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

function formatDeadline(deadline: string): string {
  const date = new Date(deadline)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `Просрочено ${Math.abs(diffDays)} дн.`
  }
  if (diffDays === 0) {
    return 'Сегодня'
  }
  if (diffDays === 1) {
    return 'Завтра'
  }
  if (diffDays <= 7) {
    return `Через ${diffDays} дн.`
  }

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
