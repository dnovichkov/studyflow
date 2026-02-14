import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useBoardStore } from '@/stores/boardStore'
import { mapTask, mapColumn } from '@/lib/mappers'

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
      .channel(`tasks-changes-${boardId}`)
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
      .channel(`columns-changes-${boardId}`)
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
