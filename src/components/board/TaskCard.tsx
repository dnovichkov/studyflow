import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import type { Task, Subject } from '@/types'
import { PRIORITY_COLORS } from '@/types'
import { cn } from '@/lib/utils'
import type { TFunction } from 'i18next'

interface TaskCardProps {
  task: Task
  subject?: Subject
  columnTitle?: string
  onClick?: () => void
}

export function TaskCard({ task, subject, onClick }: TaskCardProps) {
  const { t, i18n } = useTranslation()
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

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.completedAt
  const isCompletedLate = task.completedAt && task.deadline && new Date(task.deadline) < new Date(task.completedAt)

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
            {t(`task.priority.${task.priority}`)}
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
            <span className={cn(
              isOverdue && 'text-destructive font-medium',
              isCompletedLate && 'text-yellow-600 dark:text-yellow-400'
            )}>
              {formatDeadline(task.deadline, task.completedAt, t, i18n.language)}
            </span>
          )}
          {task.isRepeat && (
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" title={t('task.repeatBadge')}>
              ↻
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

function formatDeadline(deadline: string, completedAt: string | null | undefined, t: TFunction, language: string): string {
  const date = new Date(deadline)
  const referenceDate = completedAt ? new Date(completedAt) : new Date()

  const deadlineDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const referenceDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  const diffDays = Math.round((deadlineDay.getTime() - referenceDay.getTime()) / (1000 * 60 * 60 * 24))

  const locale = language === 'ru' ? 'ru-RU' : 'en-US'

  if (completedAt) {
    if (diffDays < 0) {
      return t('deadline.submittedLate', { count: Math.abs(diffDays) })
    }
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  }

  if (diffDays < 0) {
    return t('deadline.overdue', { count: Math.abs(diffDays) })
  }
  if (diffDays === 0) {
    return t('deadline.today')
  }
  if (diffDays === 1) {
    return t('deadline.tomorrow')
  }
  if (diffDays <= 7) {
    return t('deadline.inDays', { count: diffDays })
  }

  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}
