import { useCallback, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Column } from './Column'
import { TaskCard } from './TaskCard'
import { useBoardStore } from '@/stores/boardStore'
import type { Task } from '@/types'

interface BoardProps {
  onAddTask: (columnId: string) => void
  onEditTask: (task: Task) => void
}

export function Board({ onAddTask, onEditTask }: BoardProps) {
  const { columns, tasks, subjects, userRole, moveTask, reorderTasks } = useBoardStore()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const canEdit = userRole === 'owner' || userRole === 'editor'

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 5,
    },
  })
  const sensors = useSensors(
    ...(canEdit ? [pointerSensor, touchSensor] : [])
  )

  const getTasksByColumn = useCallback(
    (columnId: string) => {
      return tasks
        .filter((t) => t.columnId === columnId)
        .sort((a, b) => a.position - b.position)
    },
    [tasks]
  )

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTask = tasks.find((t) => t.id === activeId)
    if (!activeTask) return

    const overTask = tasks.find((t) => t.id === overId)
    const overColumn = columns.find((c) => c.id === overId)

    if (overTask && activeTask.columnId !== overTask.columnId) {
      const overColumnTasks = getTasksByColumn(overTask.columnId)
      const overIndex = overColumnTasks.findIndex((t) => t.id === overId)
      moveTask(activeId, overTask.columnId, overIndex)
    } else if (overColumn && activeTask.columnId !== overColumn.id) {
      const columnTasks = getTasksByColumn(overColumn.id)
      moveTask(activeId, overColumn.id, columnTasks.length)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeTask = tasks.find((t) => t.id === activeId)
    const overTask = tasks.find((t) => t.id === overId)

    if (activeTask && overTask && activeTask.columnId === overTask.columnId) {
      const columnTasks = getTasksByColumn(activeTask.columnId)
      const oldIndex = columnTasks.findIndex((t) => t.id === activeId)
      const newIndex = columnTasks.findIndex((t) => t.id === overId)

      if (oldIndex !== newIndex) {
        const newOrder = arrayMove(columnTasks, oldIndex, newIndex)
        reorderTasks(activeTask.columnId, newOrder.map((t) => t.id))
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-4">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={getTasksByColumn(column.id)}
            subjects={subjects}
            onAddTask={() => onAddTask(column.id)}
            onTaskClick={onEditTask}
            canEdit={canEdit}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <TaskCard
            task={activeTask}
            subject={subjects.find((s) => s.id === activeTask.subjectId)}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
