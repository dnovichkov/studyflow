import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useBoardStore } from '@/stores/boardStore'
import type { Task, Column } from '@/types'

function mapTask(data: Record<string, unknown>): Task {
  return {
    id: data.id as string,
    columnId: data.column_id as string,
    subjectId: data.subject_id as string | null,
    title: data.title as string,
    description: data.description as string | null,
    deadline: data.deadline as string | null,
    priority: data.priority as 'low' | 'medium' | 'high',
    position: data.position as number,
    isRepeat: (data.is_repeat as boolean) ?? false,
    completedAt: data.completed_at as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  }
}

function mapColumn(data: Record<string, unknown>): Column {
  return {
    id: data.id as string,
    boardId: data.board_id as string,
    title: data.title as string,
    position: data.position as number,
    createdAt: data.created_at as string,
  }
}

function handleTaskChange(payload: {
  eventType: string
  new: Record<string, unknown>
  old: Record<string, unknown>
}) {
  const { eventType, new: newRecord, old: oldRecord } = payload
  const store = useBoardStore.getState()

  switch (eventType) {
    case 'INSERT': {
      const newTask = mapTask(newRecord)
      if (!store.tasks.find((t) => t.id === newTask.id)) {
        useBoardStore.setState({
          tasks: [...store.tasks, newTask],
        })
      }
      break
    }
    case 'UPDATE': {
      const updatedTask = mapTask(newRecord)
      useBoardStore.setState({
        tasks: store.tasks.map((t) =>
          t.id === updatedTask.id ? updatedTask : t
        ),
      })
      break
    }
    case 'DELETE': {
      const deletedId = oldRecord.id as string
      useBoardStore.setState({
        tasks: store.tasks.filter((t) => t.id !== deletedId),
      })
      break
    }
  }
}

function handleColumnChange(payload: {
  eventType: string
  new: Record<string, unknown>
  old: Record<string, unknown>
}) {
  const { eventType, new: newRecord, old: oldRecord } = payload
  const store = useBoardStore.getState()

  switch (eventType) {
    case 'INSERT': {
      const newColumn = mapColumn(newRecord)
      if (!store.columns.find((c) => c.id === newColumn.id)) {
        useBoardStore.setState({
          columns: [...store.columns, newColumn].sort(
            (a, b) => a.position - b.position
          ),
        })
      }
      break
    }
    case 'UPDATE': {
      const updatedColumn = mapColumn(newRecord)
      useBoardStore.setState({
        columns: store.columns
          .map((c) => (c.id === updatedColumn.id ? updatedColumn : c))
          .sort((a, b) => a.position - b.position),
      })
      break
    }
    case 'DELETE': {
      const deletedId = oldRecord.id as string
      useBoardStore.setState({
        columns: store.columns.filter((c) => c.id !== deletedId),
      })
      break
    }
  }
}

export function useRealtime(boardId: string | undefined) {
  const { columns } = useBoardStore()

  useEffect(() => {
    if (!boardId) return

    const columnIds = columns.map((c) => c.id)
    if (columnIds.length === 0) return

    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `column_id=in.(${columnIds.join(',')})`,
        },
        (payload) => {
          handleTaskChange(payload)
        }
      )
      .subscribe()

    const columnsChannel = supabase
      .channel('columns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'columns',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          handleColumnChange(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tasksChannel)
      supabase.removeChannel(columnsChannel)
    }
  }, [boardId, columns])
}
