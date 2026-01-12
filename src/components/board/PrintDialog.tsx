import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBoardStore } from '@/stores/boardStore'
import type { Task, Subject, Column } from '@/types'

interface PrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type GroupBy = 'subject' | 'deadline' | 'column'

function formatPrintDeadline(deadline: string | null): string {
  if (!deadline) return ''
  const date = new Date(deadline)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const isToday = date.toDateString() === now.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()

  if (isToday) return 'Сегодня'
  if (isTomorrow) return 'Завтра'

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  })
}

function getIncompleteTasks(tasks: Task[], columns: Column[]): Task[] {
  const doneColumn = columns.find((c) => c.title === 'Готово')
  if (!doneColumn) return tasks
  return tasks.filter((t) => t.columnId !== doneColumn.id)
}

function sortTasks(tasks: Task[]): Task[] {
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

interface GroupedTasks {
  key: string
  label: string
  color?: string | null
  tasks: Task[]
}

function groupBySubject(tasks: Task[], subjects: Subject[]): GroupedTasks[] {
  const groups = new Map<string, GroupedTasks>()

  groups.set('none', { key: 'none', label: 'Без предмета', color: null, tasks: [] })

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
    return a.label.localeCompare(b.label, 'ru')
  })
}

function groupByColumn(tasks: Task[], columns: Column[]): GroupedTasks[] {
  const columnOrder = ['Задали', 'Делаю', 'Повторить']
  const result: GroupedTasks[] = []

  columnOrder.forEach((title) => {
    const column = columns.find((c) => c.title === title)
    if (!column) return

    const columnTasks = tasks.filter((t) => t.columnId === column.id)
    if (columnTasks.length > 0) {
      result.push({
        key: column.id,
        label: title,
        color: null,
        tasks: sortTasks(columnTasks),
      })
    }
  })

  return result
}

function groupByDeadline(tasks: Task[]): GroupedTasks[] {
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
    result.push({ key: 'overdue', label: 'Просрочено', color: '#ef4444', tasks: sortTasks(overdue) })
  }
  if (today.length > 0) {
    result.push({ key: 'today', label: 'Сегодня', color: '#f97316', tasks: sortTasks(today) })
  }
  if (tomorrowTasks.length > 0) {
    result.push({ key: 'tomorrow', label: 'Завтра', color: '#eab308', tasks: sortTasks(tomorrowTasks) })
  }
  if (thisWeek.length > 0) {
    result.push({ key: 'week', label: 'На этой неделе', color: '#22c55e', tasks: sortTasks(thisWeek) })
  }
  if (later.length > 0) {
    result.push({ key: 'later', label: 'Позже', color: '#3b82f6', tasks: sortTasks(later) })
  }
  if (noDeadline.length > 0) {
    result.push({ key: 'none', label: 'Без срока', color: null, tasks: sortTasks(noDeadline) })
  }

  return result
}

function getPriorityMarker(priority: string): string {
  switch (priority) {
    case 'high':
      return '!!!'
    case 'medium':
      return '!!'
    default:
      return ''
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function PrintDialog({ open, onOpenChange }: PrintDialogProps) {
  const { tasks, columns, subjects } = useBoardStore()
  const [groupBy, setGroupBy] = useState<GroupBy>('subject')

  const incompleteTasks = useMemo(
    () => getIncompleteTasks(tasks, columns),
    [tasks, columns]
  )

  const groupedTasks = useMemo(() => {
    switch (groupBy) {
      case 'subject':
        return groupBySubject(incompleteTasks, subjects)
      case 'column':
        return groupByColumn(incompleteTasks, columns)
      case 'deadline':
        return groupByDeadline(incompleteTasks)
      default:
        return groupBySubject(incompleteTasks, subjects)
    }
  }, [incompleteTasks, subjects, columns, groupBy])

  const getColumnName = (columnId: string): string => {
    return columns.find((c) => c.id === columnId)?.title || ''
  }

  const getSubjectName = (subjectId: string | null): string | null => {
    if (!subjectId) return null
    return subjects.find((s) => s.id === subjectId)?.name || null
  }

  const handlePrint = () => {
    const currentDate = new Date().toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    let tasksHtml = ''

    groupedTasks.forEach((group) => {
      const borderColor = group.color || '#333'
      const labelColor = group.color || '#000'

      tasksHtml += `
        <div class="section">
          <div class="section-header" style="border-bottom-color: ${borderColor};">
            <span style="color: ${labelColor};">${escapeHtml(group.label)}</span>
            <span class="count">(${group.tasks.length})</span>
          </div>
          <div class="tasks">
      `

      group.tasks.forEach((task) => {
        const priorityMarker = getPriorityMarker(task.priority)
        const subjectName = groupBy !== 'subject' ? getSubjectName(task.subjectId) : null
        const columnName = groupBy !== 'column' ? getColumnName(task.columnId) : null
        const deadline = groupBy !== 'deadline' ? formatPrintDeadline(task.deadline) : null

        let meta = ''
        if (subjectName) meta += `[${escapeHtml(subjectName)}] `
        if (columnName) meta += `[${escapeHtml(columnName)}] `
        if (deadline) meta += `— ${escapeHtml(deadline)}`

        tasksHtml += `
          <div class="task">
            <span class="checkbox"></span>
            <div class="task-content">
              ${priorityMarker ? `<span class="priority">${priorityMarker}</span>` : ''}
              <span class="title">${escapeHtml(task.title)}</span>
              ${meta ? `<span class="meta">${meta}</span>` : ''}
            </div>
          </div>
        `
      })

      tasksHtml += '</div></div>'
    })

    const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Мои задания</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12pt;
      line-height: 1.4;
      color: #000;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 20pt;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .header .date {
      font-size: 11pt;
      color: #555;
      text-transform: capitalize;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-header {
      font-size: 14pt;
      font-weight: 600;
      padding-bottom: 6px;
      margin-bottom: 10px;
      border-bottom: 2px solid #333;
    }
    .section-header .count {
      font-weight: normal;
      font-size: 11pt;
      color: #666;
      margin-left: 8px;
    }
    .tasks {
      padding-left: 4px;
    }
    .task {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 10px;
    }
    .checkbox {
      width: 16px;
      height: 16px;
      min-width: 16px;
      border: 2px solid #000;
      border-radius: 2px;
      margin-top: 2px;
    }
    .task-content {
      flex: 1;
    }
    .priority {
      color: #dc2626;
      font-weight: bold;
      margin-right: 4px;
    }
    .title {
      font-weight: 500;
    }
    .meta {
      color: #666;
      font-size: 10pt;
      margin-left: 6px;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Мои задания</h1>
    <div class="date">${escapeHtml(currentDate)}</div>
  </div>
  ${tasksHtml}
</body>
</html>
    `

    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  const totalTasks = incompleteTasks.length

  const currentDate = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Печать заданий</DialogTitle>
          <DialogDescription>
            Невыполненных заданий: {totalTasks}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="groupBy">Группировать по</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                <SelectTrigger id="groupBy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subject">Предмету</SelectItem>
                  <SelectItem value="deadline">Сроку</SelectItem>
                  <SelectItem value="column">Статусу</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4 border rounded-lg p-4 bg-muted/30 max-h-[300px] overflow-y-auto">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">Мои задания</h2>
            <p className="text-sm text-muted-foreground capitalize">{currentDate}</p>
          </div>

          {groupedTasks.map((group) => (
            <div key={group.key}>
              <div
                className="font-semibold text-sm border-b pb-1 mb-2"
                style={{ borderColor: group.color || '#d1d5db' }}
              >
                <span style={{ color: group.color || 'inherit' }}>{group.label}</span>
                <span className="text-muted-foreground font-normal text-xs ml-2">
                  ({group.tasks.length})
                </span>
              </div>

              <div className="space-y-1.5">
                {group.tasks.map((task) => {
                  const priorityMarker = getPriorityMarker(task.priority)
                  const subjectName = groupBy !== 'subject' ? getSubjectName(task.subjectId) : null
                  const columnName = groupBy !== 'column' ? getColumnName(task.columnId) : null
                  const deadline = groupBy !== 'deadline' ? formatPrintDeadline(task.deadline) : null

                  return (
                    <div key={task.id} className="flex items-start gap-2 pl-1 text-sm">
                      <span className="inline-block w-3.5 h-3.5 border border-gray-400 rounded-sm mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">
                          {priorityMarker && (
                            <span className="text-red-600 mr-1">{priorityMarker}</span>
                          )}
                          {task.title}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          {subjectName && <span>[{subjectName}]</span>}
                          {columnName && <span className="ml-1">[{columnName}]</span>}
                          {deadline && <span className="ml-1">— {deadline}</span>}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {totalTasks === 0 && (
            <p className="text-center text-muted-foreground py-4">
              Нет невыполненных заданий
            </p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handlePrint} disabled={totalTasks === 0}>
            Печать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
