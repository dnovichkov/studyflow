import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import i18n from '@/i18n'
import type { Board, Column, Task, Subject } from '@/types'
import { getSafeErrorMessage } from '@/lib/errorMessages'
import { mapBoard, mapColumn, mapTask, mapSubject } from '@/lib/mappers'
import { devError } from '@/lib/logger'
import { trackEvent } from '@/lib/analytics'

export const SUBJECT_COLORS = [
  '#3b82f6', '#ef4444', '#a855f7', '#22c55e', '#f59e0b',
  '#06b6d4', '#ec4899', '#84cc16', '#14b8a6', '#6366f1',
  '#f97316', '#64748b',
]

type UserRole = 'owner' | 'editor' | 'viewer'

interface AvailableBoard {
  id: string
  title: string
  role: UserRole
  isOwner: boolean
  ownerEmail?: string
  schoolYear: string | null
  archivedAt: string | null
}

export interface NewSchoolYearOptions {
  title: string
  schoolYear?: string | null
  /** null = перенести все предметы */
  subjectIds: string[] | null
  carryOverTasks: boolean
  copyMembers: boolean
  archiveSource: boolean
}

interface BoardState {
  board: Board | null
  columns: Column[]
  tasks: Task[]
  subjects: Subject[]
  userRole: UserRole
  availableBoards: AvailableBoard[]
  loading: boolean
  error: string | null

  fetchBoard: (userId: string, boardId?: string) => Promise<void>
  fetchAvailableBoards: (userId: string) => Promise<void>
  switchBoard: (userId: string, boardId: string) => Promise<void>
  createBoard: (userId: string, title: string) => Promise<Board>
  createDefaultColumns: (boardId: string) => Promise<void>
  createDefaultSubjects: (boardId: string) => Promise<void>

  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  moveTask: (taskId: string, newColumnId: string, newPosition: number) => Promise<void>
  reorderTasks: (columnId: string, taskIds: string[]) => Promise<void>

  leaveBoard: (userId: string, boardId: string) => Promise<void>

  archiveBoard: (userId: string, boardId: string) => Promise<void>
  unarchiveBoard: (boardId: string) => Promise<void>
  startNewSchoolYear: (userId: string, options: NewSchoolYearOptions) => Promise<void>

  addSubject: (boardId: string, name: string, color?: string) => Promise<Subject>
  updateSubject: (id: string, updates: { name?: string; color?: string | null }) => Promise<void>
  deleteSubject: (id: string) => Promise<void>
}

let fetchBoardInProgress: Promise<void> | null = null

export const useBoardStore = create<BoardState>((set, get) => ({
  board: null,
  columns: [],
  tasks: [],
  subjects: [],
  userRole: 'viewer',
  availableBoards: [],
  loading: false,
  error: null,

  fetchAvailableBoards: async (userId: string) => {
    try {
      // Get own boards
      const { data: ownBoards, error: ownError } = await supabase
        .from('boards')
        .select('id, title, school_year, archived_at')
        .eq('user_id', userId)

      if (ownError) throw ownError

      // Get shared boards through board_members
      const { data: memberships, error: memberError } = await supabase
        .from('board_members')
        .select(`
          role,
          board:boards(id, title, owner_email, school_year, archived_at)
        `)
        .eq('user_id', userId)

      if (memberError) throw memberError

      const available: AvailableBoard[] = []

      // Add own boards
      for (const board of ownBoards || []) {
        available.push({
          id: board.id,
          title: board.title,
          role: 'owner',
          isOwner: true,
          schoolYear: board.school_year ?? null,
          archivedAt: board.archived_at ?? null,
        })
      }

      // Add shared boards (excluding ones where user is owner)
      for (const membership of memberships || []) {
        // Supabase can return array or single object for joins
        const boardRaw = membership.board
        const boardData = Array.isArray(boardRaw) ? boardRaw[0] : boardRaw
        if (boardData && !available.some(b => b.id === boardData.id)) {
          available.push({
            id: boardData.id as string,
            title: boardData.title as string,
            role: membership.role as UserRole,
            isOwner: false,
            ownerEmail: boardData.owner_email as string | undefined,
            schoolYear: (boardData.school_year as string | null) ?? null,
            archivedAt: (boardData.archived_at as string | null) ?? null,
          })
        }
      }

      set({ availableBoards: available })
    } catch (err) {
      devError('Error fetching available boards:', err)
    }
  },

  switchBoard: async (userId: string, boardId: string) => {
    localStorage.setItem('selectedBoardId', boardId)
    await get().fetchBoard(userId, boardId)
  },

  fetchBoard: async (userId: string, boardId?: string) => {
    // Prevent concurrent calls (React Strict Mode calls effects twice)
    if (fetchBoardInProgress) {
      return fetchBoardInProgress
    }

    set({ loading: true, error: null })
    const promise = (async () => {
    try {
      // First fetch available boards to know what we can access
      await get().fetchAvailableBoards(userId)
      const availableBoards = get().availableBoards

      let board = null

      // If boardId specified, try to load that board
      if (boardId) {
        const { data, error } = await supabase
          .from('boards')
          .select('*')
          .eq('id', boardId)
          .single()

        if (!error && data) {
          board = data
        }
      }

      // If no board yet, try to load from localStorage
      if (!board) {
        const savedBoardId = localStorage.getItem('selectedBoardId')
        if (savedBoardId && availableBoards.some(b => b.id === savedBoardId)) {
          const { data, error } = await supabase
            .from('boards')
            .select('*')
            .eq('id', savedBoardId)
            .single()

          if (!error && data) {
            board = data
          }
        }
      }

      // If still no board, get first available (prefer own and active boards).
      // Активные важнее архивных: иначе пользователь, закрывший прошлый год,
      // каждый раз попадал бы в доску только для чтения. Если активных нет —
      // берём последнюю заархивированную, а не создаём молча пустую доску.
      if (!board && availableBoards.length > 0) {
        const activeBoards = availableBoards.filter((b) => !b.archivedAt)
        const pool = activeBoards.length > 0
          ? activeBoards
          : [...availableBoards].sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''))
        const targetBoard = pool.find((b) => b.isOwner) || pool[0]

        const { data, error } = await supabase
          .from('boards')
          .select('*')
          .eq('id', targetBoard.id)
          .single()

        if (!error && data) {
          board = data
        }
      }

      // If still no board, create a new one
      if (!board) {
        board = await get().createBoard(userId, i18n.t('defaults.boardName'))
        await get().createDefaultColumns(board.id)
        await get().createDefaultSubjects(board.id)
        // Refresh available boards after creating
        await get().fetchAvailableBoards(userId)
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

      // Save selected board to localStorage
      localStorage.setItem('selectedBoardId', board.id)

      // Fetch subjects for the board
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .eq('board_id', board.id)
        .order('name')

      set({
        board: mapBoard(board),
        columns: columns?.map(mapColumn) || [],
        tasks: tasks?.map(mapTask) || [],
        subjects: subjectsData?.map(mapSubject) || [],
        userRole,
        loading: false,
      })
    } catch (err) {
      set({ error: getSafeErrorMessage(err, 'errors.generic'), loading: false })
    }
    })()

    fetchBoardInProgress = promise
    try {
      await promise
    } finally {
      fetchBoardInProgress = null
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
    const columnNames = i18n.t('defaults.columns', { returnObjects: true }) as string[]
    const defaultColumns = columnNames.map((title, position) => ({
      board_id: boardId,
      title,
      position,
    }))

    const { error } = await supabase.from('columns').insert(defaultColumns)
    if (error) throw error
  },

  createDefaultSubjects: async (boardId: string) => {
    const subjectNames = i18n.t('defaults.subjects', { returnObjects: true }) as string[]
    const defaultSubjects = subjectNames.map((name, i) => ({
      name,
      color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
    }))

    await supabase
      .from('subjects')
      .upsert(defaultSubjects.map(s => ({ ...s, board_id: boardId })), {
        onConflict: 'board_id,name',
        ignoreDuplicates: true,
      })
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
    trackEvent('task_created', {
      priority: task.priority || 'none',
      hasDeadline: !!task.deadline,
    })
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
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt

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
    trackEvent('task_deleted')
  },

  moveTask: async (taskId: string, newColumnId: string, newPosition: number) => {
    const state = get()
    const task = state.tasks.find((t) => t.id === taskId)
    const columns = state.columns

    // Auto-move logic: if task is marked as repeat and moved to "Done" (position 2), redirect to "Repeat" (position 3)
    let targetColumnId = newColumnId
    let targetPosition = newPosition

    if (task?.isRepeat) {
      const targetColumn = columns.find((c) => c.id === newColumnId)
      const repeatColumn = columns.find((c) => c.position === 3)

      if (targetColumn?.position === 2 && repeatColumn) {
        targetColumnId = repeatColumn.id
        // Calculate position at the end of "Repeat" column
        const repeatTasks = state.tasks.filter((t) => t.columnId === repeatColumn.id)
        targetPosition = repeatTasks.length > 0
          ? Math.max(...repeatTasks.map((t) => t.position)) + 1
          : 0
      }
    }

    // Determine completedAt based on target column (position 2 = done column)
    const targetColumn = columns.find((c) => c.id === targetColumnId)
    const previousColumn = task ? columns.find((c) => c.id === task.columnId) : null
    const isDoneColumn = targetColumn?.position === 2
    const wasDone = previousColumn?.position === 2

    let completedAt = task?.completedAt ?? null
    if (isDoneColumn && !wasDone) {
      completedAt = new Date().toISOString()
    } else if (!isDoneColumn && wasDone) {
      completedAt = null
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, columnId: targetColumnId, position: targetPosition, completedAt } : t
      ),
    }))

    const { error } = await supabase
      .from('tasks')
      .update({ column_id: targetColumnId, position: targetPosition, completed_at: completedAt })
      .eq('id', taskId)

    if (error) {
      get().fetchBoard(get().board?.userId || '')
      throw error
    }

    if (isDoneColumn && !wasDone) {
      trackEvent('task_completed')
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

  leaveBoard: async (userId: string, boardId: string) => {
    const { error } = await supabase
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', userId)

    if (error) throw error

    // Remove from available boards
    const available = get().availableBoards.filter((b) => b.id !== boardId)
    set({ availableBoards: available })

    // If we left the current board, switch to first own board
    if (get().board?.id === boardId) {
      const ownBoard = available.find((b) => b.isOwner)
      if (ownBoard) {
        await get().switchBoard(userId, ownBoard.id)
      } else {
        await get().fetchBoard(userId)
      }
    }
  },

  archiveBoard: async (userId: string, boardId: string) => {
    const archivedAt = new Date().toISOString()
    const { error } = await supabase
      .from('boards')
      .update({ archived_at: archivedAt })
      .eq('id', boardId)

    if (error) throw error

    set((state) => ({
      board: state.board && state.board.id === boardId
        ? { ...state.board, archivedAt }
        : state.board,
      availableBoards: state.availableBoards.map((b) =>
        b.id === boardId ? { ...b, archivedAt } : b
      ),
    }))
    trackEvent('board_archived')

    // Заархивировали текущую доску — уходим на активную, если она есть.
    // Если активных нет, остаёмся здесь: баннер предложит начать новый год.
    if (get().board?.id === boardId) {
      const nextBoard = get().availableBoards.find((b) => b.isOwner && !b.archivedAt)
      if (nextBoard) {
        await get().switchBoard(userId, nextBoard.id)
      }
    }
  },

  unarchiveBoard: async (boardId: string) => {
    const { error } = await supabase
      .from('boards')
      .update({ archived_at: null })
      .eq('id', boardId)

    if (error) throw error

    set((state) => ({
      board: state.board && state.board.id === boardId
        ? { ...state.board, archivedAt: null }
        : state.board,
      availableBoards: state.availableBoards.map((b) =>
        b.id === boardId ? { ...b, archivedAt: null } : b
      ),
    }))
    trackEvent('board_unarchived')
  },

  startNewSchoolYear: async (userId: string, options: NewSchoolYearOptions) => {
    const sourceBoardId = get().board?.id
    if (!sourceBoardId) throw new Error('No board selected')

    // Создание доски, копирование колонок, предметов, заданий и участников
    // плюс архивирование исходной — одной транзакцией на стороне БД
    const { data, error } = await supabase.rpc('start_new_school_year', {
      p_source_board_id: sourceBoardId,
      p_title: options.title,
      p_school_year: options.schoolYear ?? null,
      p_subject_ids: options.subjectIds,
      p_carry_over_tasks: options.carryOverTasks,
      p_copy_members: options.copyMembers,
      p_archive_source: options.archiveSource,
    })

    if (error) throw error

    trackEvent('school_year_started', {
      subjects: options.subjectIds?.length ?? get().subjects.length,
      carriedTasks: options.carryOverTasks,
      archivedSource: options.archiveSource,
    })

    await get().switchBoard(userId, data as string)
  },

  addSubject: async (boardId: string, name: string, color?: string) => {
    const assignedColor = color ?? SUBJECT_COLORS[get().subjects.length % SUBJECT_COLORS.length]
    const { data, error } = await supabase
      .from('subjects')
      .insert({ board_id: boardId, name, color: assignedColor })
      .select()
      .single()

    if (error) throw error

    const newSubject = mapSubject(data)
    set((state) => ({ subjects: [...state.subjects, newSubject] }))
    trackEvent('subject_created')
    return newSubject
  },

  updateSubject: async (id: string, updates: { name?: string; color?: string | null }) => {
    const { error } = await supabase.from('subjects').update(updates).eq('id', id)
    if (error) throw error

    set((state) => ({
      subjects: state.subjects.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }))
  },

  deleteSubject: async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id)
    if (error) throw error

    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== id),
      tasks: state.tasks.map((t) => (t.subjectId === id ? { ...t, subjectId: null } : t)),
    }))
  },
}))

/**
 * Право на запись = подходящая роль И неархивная доска.
 *
 * Формула была продублирована в четырёх компонентах — с появлением архива
 * условие стало составным, и держать его в одном месте дешевле, чем
 * не забыть дописать `&& !archivedAt` в каждом.
 * Настоящий запрет всё равно живёт в RLS, здесь только состояние интерфейса.
 */
export function useCanEdit(): boolean {
  return useBoardStore(
    (s) => (s.userRole === 'owner' || s.userRole === 'editor') && !s.board?.archivedAt
  )
}

export function useIsArchived(): boolean {
  return useBoardStore((s) => !!s.board?.archivedAt)
}
