import type { Task, Subject, Column } from '@/types'
import type { TFunction } from 'i18next'

export type GroupBy = 'subject' | 'deadline' | 'column'

export interface GroupedTasks {
  key: string
  label: string
  color?: string | null
  tasks: Task[]
}

export function formatPrintDeadline(deadline: string | null, t: TFunction, locale: string): string {
  if (!deadline) return ''
  const date = new Date(deadline)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const isToday = date.toDateString() === now.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  if (isToday) return t('deadline.today')
  if (isTomorrow) return t('deadline.tomorrow')

  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  })
}

export function getIncompleteTasks(tasks: Task[], columns: Column[]): Task[] {
  const doneColumn = columns.find((c) => c.position === 2)
  if (!doneColumn) return tasks
  return tasks.filter((t) => t.columnId !== doneColumn.id)
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    if (a.deadline) return -1
    if (b.deadline) return 1

    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

export function groupBySubject(tasks: Task[], subjects: Subject[], noSubjectLabel: string): GroupedTasks[] {
  const groups = new Map<string, GroupedTasks>()

  groups.set('none', { key: 'none', label: noSubjectLabel, color: null, tasks: [] })

  subjects.forEach((s) => {
    groups.set(s.id, { key: s.id, label: s.name, color: s.color, tasks: [] })
  })

  tasks.forEach((task) => {
    const key = task.subjectId || 'none'
    const group = groups.get(key)
    if (group) {
      group.tasks.push(task)
    }
  })

  const result: GroupedTasks[] = []
  groups.forEach((group) => {
    if (group.tasks.length > 0) {
      group.tasks = sortTasks(group.tasks)
      result.push(group)
    }
  })

  return result.sort((a, b) => {
    if (a.key === 'none') return 1
    if (b.key === 'none') return -1
    return a.label.localeCompare(b.label)
  })
}

export function groupByColumn(tasks: Task[], columns: Column[], columnNames: string[]): GroupedTasks[] {
  const positions = [0, 1, 3]
  const result: GroupedTasks[] = []

  positions.forEach((pos) => {
    const column = columns.find((c) => c.position === pos)
    if (!column) return

    const columnTasks = tasks.filter((t) => t.columnId === column.id)
    if (columnTasks.length > 0) {
      result.push({
        key: column.id,
        label: columnNames[pos] ?? column.title,
        color: null,
        tasks: sortTasks(columnTasks),
      })
    }
  })

  return result
}

export function groupByDeadline(tasks: Task[], t: TFunction): GroupedTasks[] {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const overdue: Task[] = []
  const today: Task[] = []
  const tomorrowTasks: Task[] = []
  const thisWeek: Task[] = []
  const later: Task[] = []
  const noDeadline: Task[] = []

  tasks.forEach((task) => {
    if (!task.deadline) {
      noDeadline.push(task)
      return
    }

    const deadline = new Date(task.deadline)
    deadline.setHours(0, 0, 0, 0)

    if (deadline < now) {
      overdue.push(task)
    } else if (deadline.getTime() === now.getTime()) {
      today.push(task)
    } else if (deadline.getTime() === tomorrow.getTime()) {
      tomorrowTasks.push(task)
    } else if (deadline < weekEnd) {
      thisWeek.push(task)
    } else {
      later.push(task)
    }
  })

  const result: GroupedTasks[] = []

  if (overdue.length > 0) {
    result.push({ key: 'overdue', label: t('print.deadlineCategory.overdue'), color: '#ef4444', tasks: sortTasks(overdue) })
  }
  if (today.length > 0) {
    result.push({ key: 'today', label: t('print.deadlineCategory.today'), color: '#f97316', tasks: sortTasks(today) })
  }
  if (tomorrowTasks.length > 0) {
    result.push({ key: 'tomorrow', label: t('print.deadlineCategory.tomorrow'), color: '#eab308', tasks: sortTasks(tomorrowTasks) })
  }
  if (thisWeek.length > 0) {
    result.push({ key: 'week', label: t('print.deadlineCategory.thisWeek'), color: '#22c55e', tasks: sortTasks(thisWeek) })
  }
  if (later.length > 0) {
    result.push({ key: 'later', label: t('print.deadlineCategory.later'), color: '#3b82f6', tasks: sortTasks(later) })
  }
  if (noDeadline.length > 0) {
    result.push({ key: 'none', label: t('print.deadlineCategory.noDeadline'), color: null, tasks: sortTasks(noDeadline) })
  }

  return result
}

export function getPriorityMarker(priority: string): string {
  switch (priority) {
    case 'high':
      return '!!!'
    case 'medium':
      return '!!'
    default:
      return ''
  }
}
