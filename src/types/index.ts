export type Priority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  columnId: string
  subjectId: string | null
  title: string
  description: string | null
  deadline: string | null
  priority: Priority
  position: number
  isRepeat: boolean
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Column {
  id: string
  boardId: string
  title: string
  position: number
  createdAt: string
}

export interface Board {
  id: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface Subject {
  id: string
  boardId: string
  userId?: string | null
  name: string
  color: string | null
  createdAt: string
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

export const DEFAULT_COLUMNS = [
  { title: 'Задали', position: 0 },
  { title: 'Делаю', position: 1 },
  { title: 'Готово', position: 2 },
  { title: 'Повторить', position: 3 },
]
