import type { Board, Column, Task, Subject, Priority } from '@/types'

const VALID_PRIORITIES: Priority[] = ['low', 'medium', 'high']

function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Expected string for ${field}, got ${typeof value}`)
  }
  return value
}

function assertNumber(value: unknown, field: string): number {
  if (typeof value !== 'number') {
    throw new Error(`Expected number for ${field}, got ${typeof value}`)
  }
  return value
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function mapBoard(data: Record<string, unknown>): Board {
  return {
    id: assertString(data.id, 'board.id'),
    userId: assertString(data.user_id, 'board.user_id'),
    title: assertString(data.title, 'board.title'),
    createdAt: assertString(data.created_at, 'board.created_at'),
    updatedAt: assertString(data.updated_at, 'board.updated_at'),
  }
}

export function mapColumn(data: Record<string, unknown>): Column {
  return {
    id: assertString(data.id, 'column.id'),
    boardId: assertString(data.board_id, 'column.board_id'),
    title: assertString(data.title, 'column.title'),
    position: assertNumber(data.position, 'column.position'),
    createdAt: assertString(data.created_at, 'column.created_at'),
  }
}

export function mapTask(data: Record<string, unknown>): Task {
  const rawPriority = data.priority as string
  return {
    id: assertString(data.id, 'task.id'),
    columnId: assertString(data.column_id, 'task.column_id'),
    subjectId: optionalString(data.subject_id),
    title: assertString(data.title, 'task.title'),
    description: optionalString(data.description),
    deadline: optionalString(data.deadline),
    priority: VALID_PRIORITIES.includes(rawPriority as Priority) ? (rawPriority as Priority) : 'medium',
    position: assertNumber(data.position, 'task.position'),
    isRepeat: (data.is_repeat as boolean) ?? false,
    completedAt: optionalString(data.completed_at),
    createdAt: assertString(data.created_at, 'task.created_at'),
    updatedAt: assertString(data.updated_at, 'task.updated_at'),
  }
}

export function mapSubject(data: Record<string, unknown>): Subject {
  return {
    id: assertString(data.id, 'subject.id'),
    boardId: assertString(data.board_id, 'subject.board_id'),
    userId: optionalString(data.user_id),
    name: assertString(data.name, 'subject.name'),
    color: optionalString(data.color),
    createdAt: assertString(data.created_at, 'subject.created_at'),
  }
}
