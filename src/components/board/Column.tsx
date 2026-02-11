import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useTranslation } from 'react-i18next'
import { TaskCard } from './TaskCard'
import { Button } from '@/components/ui/button'
import type { Column as ColumnType, Task, Subject } from '@/types'
import { cn } from '@/lib/utils'

interface ColumnProps {
  column: ColumnType
  tasks: Task[]
  subjects: Subject[]
  onAddTask: () => void
  onTaskClick: (task: Task) => void
  canEdit?: boolean
}

export function Column({ column, tasks, subjects, onAddTask, onTaskClick, canEdit = true }: ColumnProps) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  const taskIds = tasks.map((t) => t.id)

  return (
    <div
      className={cn(
        'bg-muted/50 rounded-lg p-3 min-w-[280px] max-w-[280px] flex flex-col max-h-[calc(100vh-180px)]',
        isOver && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">
          {column.title}
          <span className="ml-2 text-muted-foreground">({tasks.length})</span>
        </h3>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto space-y-2 min-h-[100px]"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              subject={subjects.find((s) => s.id === task.subjectId)}
              columnTitle={column.title}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>
      </div>

      {canEdit && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-muted-foreground"
          onClick={onAddTask}
        >
          {t('board.addTask')}
        </Button>
      )}
    </div>
  )
}
