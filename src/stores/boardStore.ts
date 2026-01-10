import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Board, Column, Task, Subject, Priority } from '@/types'

type UserRole = 'owner' | 'editor' | 'viewer'

interface BoardState {
  board: Board | null
  columns: Column[]
  tasks: Task[]
  subjects: Subject[]
  userRole: UserRole
  loading: boolean
  error: string | null

  fetchBoard: (userId: string) => Promise<void>
  createBoard: (userId: string, title: string) => Promise<Board>
  createDefaultColumns: (boardId: string) => Promise<void>

  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTask: (taskId: string, newColumnId: string, newPosition: number) => Promise<void>
  reorderTasks: (columnId: string, taskIds: string[]) => Promise<void>

  addSubject: (userId: string, name: string, color?: string) => Promise<Subject>
  fetchSubjects: (userId: string) => Promise<void>
}

export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,
  columns: [],
  tasks: [],
  subjects: [],
  userRole: 'viewer',
  loading: false,
  error: null,

  fetchBoard: async (userId: string) => {
    set({ loading: true, error: null })
    try {
      const { data: boards, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', userId)
        .limit(1)

      if (boardError) throw boardError

      let board = boards?.[0] || null

      if (!board) {
        board = await get().createBoard(userId, 'Моя доска')
        await get().createDefaultColumns(board.id)
      }

      const { data: columns, error: colError } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', board.id)
        .order('position')

      if (colError) throw colError

      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .in('column_id', columns?.map((c) => c.id) || [])
        .order('position')

      if (taskError) throw taskError

      // Determine user role
      let userRole: UserRole = 'viewer'
      if (board.user_id === userId) {
        userRole = 'owner'
      } else {
        const { data: membership } = await supabase
          .from('board_members')
          .select('role')
          .eq('board_id', board.id)
          .eq('user_id', userId)
          .single()

        if (membership?.role) {
          userRole = membership.role as UserRole
        }
      }

      set({
        board: mapBoard(board),
        columns: columns?.map(mapColumn) || [],
        tasks: tasks?.map(mapTask) || [],
        userRole,
        loading: false,
      })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error fetching board', loading: false })
    }
  },

  createBoard: async (userId: string, title: string) => {
    const { data, error } = await supabase
      .from('boards')
      .insert({ user_id: userId, title })
      .select()
      .single()

    if (error) throw error
    return mapBoard(data)
  },

  createDefaultColumns: async (boardId: string) => {
    const defaultColumns = [
      { board_id: boardId, title: 'Задали', position: 0 },
      { board_id: boardId, title: 'Делаю', position: 1 },
      { board_id: boardId, title: 'Готово', position: 2 },
      { board_id: boardId, title: 'Повторить', position: 3 },
    ]

    const { error } = await supabase.from('columns').insert(defaultColumns)
    if (error) throw error
  },

  addTask: async (task) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        column_id: task.columnId,
        subject_id: task.subjectId,
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        priority: task.priority,
        position: task.position,
        is_repeat: task.isRepeat ?? false,
      })
      .select()
      .single()

    if (error) throw error

    const newTask = mapTask(data)
    set((state) => ({ tasks: [...state.tasks, newTask] }))
    return newTask
  },

  updateTask: async (id: string, updates: Partial<Task>) => {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.columnId !== undefined) dbUpdates.column_id = updates.columnId
    if (updates.subjectId !== undefined) dbUpdates.subject_id = updates.subjectId
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority
    if (updates.position !== undefined) dbUpdates.position = updates.position
    if (updates.isRepeat !== undefined) dbUpdates.is_repeat = updates.isRepeat

    const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id)

    if (error) throw error

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))
  },

  deleteTask: async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }))
  },

  moveTask: async (taskId: string, newColumnId: string, newPosition: number) => {
    const state = get()
    const task = state.tasks.find((t) => t.id === taskId)
    const columns = state.columns

    // Auto-move logic: if task is marked as repeat and moved to "Готово", redirect to "Повторить"
    let targetColumnId = newColumnId
    let targetPosition = newPosition

    if (task?.isRepeat) {
      const targetColumn = columns.find((c) => c.id === newColumnId)
      const repeatColumn = columns.find((c) => c.title === 'Повторить')

      if (targetColumn?.title === 'Готово' && repeatColumn) {
        targetColumnId = repeatColumn.id
        // Calculate position at the end of "Повторить" column
        const repeatTasks = state.tasks.filter((t) => t.columnId === repeatColumn.id)
        targetPosition = repeatTasks.length > 0
          ? Math.max(...repeatTasks.map((t) => t.position)) + 1
          : 0
      }
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, columnId: targetColumnId, position: targetPosition } : t
      ),
    }))

    const { error } = await supabase
      .from('tasks')
      .update({ column_id: targetColumnId, position: targetPosition })
      .eq('id', taskId)

    if (error) {
      get().fetchBoard(get().board?.userId || '')
      throw error
    }
  },

  reorderTasks: async (_columnId: string, taskIds: string[]) => {
    set((state) => ({
      tasks: state.tasks.map((t) => {
        const newPos = taskIds.indexOf(t.id)
        if (newPos !== -1) {
          return { ...t, position: newPos }
        }
        return t
      }),
    }))

    const updates = taskIds.map((id, index) => ({
      id,
      position: index,
    }))

    for (const update of updates) {
      await supabase.from('tasks').update({ position: update.position }).eq('id', update.id)
    }
  },

  addSubject: async (userId: string, name: string, color?: string) => {
    const { data, error } = await supabase
      .from('subjects')
      .insert({ user_id: userId, name, color })
      .select()
      .single()

    if (error) throw error

    const newSubject = mapSubject(data)
    set((state) => ({ subjects: [...state.subjects, newSubject] }))
    return newSubject
  },

  fetchSubjects: async (userId: string) => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (error) throw error
    set({ subjects: data?.map(mapSubject) || [] })
  },
}))

function mapBoard(data: Record<string, unknown>): Board {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    title: data.title as string,
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

function mapTask(data: Record<string, unknown>): Task {
  return {
    id: data.id as string,
    columnId: data.column_id as string,
    subjectId: data.subject_id as string | null,
    title: data.title as string,
    description: data.description as string | null,
    deadline: data.deadline as string | null,
    priority: data.priority as Priority,
    position: data.position as number,
    isRepeat: (data.is_repeat as boolean) ?? false,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  }
}

function mapSubject(data: Record<string, unknown>): Subject {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    name: data.name as string,
    color: data.color as string | null,
    createdAt: data.created_at as string,
  }
}
