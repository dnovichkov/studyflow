import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
import { FileDown } from 'lucide-react'
import { useBoardStore } from '@/stores/boardStore'
import type { GroupBy } from '@/lib/taskGrouping'
import {
  formatPrintDeadline,
  getIncompleteTasks,
  groupBySubject,
  groupByColumn,
  groupByDeadline,
  getPriorityMarker,
} from '@/lib/taskGrouping'
import { exportToWord } from '@/lib/exportToWord'
import { sanitizeHexColor } from '@/lib/sanitize'

interface PrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Builds print HTML and opens in a new window for printing
// Uses document.write on the print window which is the standard approach for print dialogs
function openPrintWindow(html: string) {
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (printWindow) {
    printWindow.document.open()
    printWindow.document.writeln(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }
}

export function PrintDialog({ open, onOpenChange }: PrintDialogProps) {
  const { t, i18n } = useTranslation()
  const { tasks, columns, subjects } = useBoardStore()
  const [groupBy, setGroupBy] = useState<GroupBy>('subject')

  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US'

  const incompleteTasks = useMemo(
    () => getIncompleteTasks(tasks, columns),
    [tasks, columns]
  )

  const groupedTasks = useMemo(() => {
    switch (groupBy) {
      case 'subject':
        return groupBySubject(incompleteTasks, subjects, t('print.noSubject'))
      case 'column':
        return groupByColumn(incompleteTasks, columns, t('defaults.columns', { returnObjects: true }) as string[])
      case 'deadline':
        return groupByDeadline(incompleteTasks, t)
      default:
        return groupBySubject(incompleteTasks, subjects, t('print.noSubject'))
    }
  }, [incompleteTasks, subjects, columns, groupBy, t])

  const columnNames = t('defaults.columns', { returnObjects: true }) as string[]

  const getColumnName = (columnId: string): string => {
    const col = columns.find((c) => c.id === columnId)
    if (!col) return ''
    return columnNames[col.position] ?? col.title
  }

  const getSubjectName = (subjectId: string | null): string | null => {
    if (!subjectId) return null
    return subjects.find((s) => s.id === subjectId)?.name || null
  }

  const handlePrint = () => {
    const currentDate = new Date().toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    let tasksHtml = ''

    groupedTasks.forEach((group) => {
      const borderColor = sanitizeHexColor(group.color, '#333')
      const labelColor = sanitizeHexColor(group.color, '#000')

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
        const deadline = groupBy !== 'deadline' ? formatPrintDeadline(task.deadline, t, locale) : null

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
              ${task.description ? `<div class="description">${escapeHtml(task.description)}</div>` : ''}
            </div>
          </div>
        `
      })

      tasksHtml += '</div></div>'
    })

    const myTasksTitle = escapeHtml(t('print.myTasks'))

    const html = `<!DOCTYPE html>
<html lang="${i18n.language}">
<head>
  <meta charset="UTF-8">
  <title>${myTasksTitle}</title>
  <style>
    @page { margin: 20mm 25mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12pt; line-height: 1.4; color: #000; padding: 10px 15px; max-width: 700px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { font-size: 20pt; font-weight: bold; margin-bottom: 4px; }
    .header .date { font-size: 11pt; color: #555; text-transform: capitalize; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-header { font-size: 14pt; font-weight: 600; padding-bottom: 6px; margin-bottom: 10px; border-bottom: 2px solid #333; }
    .section-header .count { font-weight: normal; font-size: 11pt; color: #666; margin-left: 8px; }
    .tasks { padding-left: 4px; }
    .task { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
    .checkbox { width: 16px; height: 16px; min-width: 16px; border: 2px solid #000; border-radius: 2px; margin-top: 2px; }
    .task-content { flex: 1; }
    .priority { color: #dc2626; font-weight: bold; margin-right: 4px; }
    .title { font-weight: 500; }
    .meta { color: #666; font-size: 10pt; margin-left: 6px; }
    .description { font-size: 9pt; color: #555; margin-top: 4px; line-height: 1.3; white-space: pre-wrap; word-break: break-word; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${myTasksTitle}</h1>
    <div class="date">${escapeHtml(currentDate)}</div>
  </div>
  ${tasksHtml}
</body>
</html>`

    openPrintWindow(html)
  }

  const handleExportWord = async () => {
    await exportToWord({
      groupedTasks,
      groupBy,
      locale,
      t,
      getColumnName,
      getSubjectName,
    })
  }

  const totalTasks = incompleteTasks.length

  const currentDate = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('print.title')}</DialogTitle>
          <DialogDescription>
            {t('print.incompleteTasks', { count: totalTasks })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="groupBy">{t('print.groupBy')}</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                <SelectTrigger id="groupBy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subject">{t('print.bySubject')}</SelectItem>
                  <SelectItem value="deadline">{t('print.byDeadline')}</SelectItem>
                  <SelectItem value="column">{t('print.byStatus')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4 border rounded-lg p-4 bg-muted/30 max-h-[300px] overflow-y-auto">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">{t('print.myTasks')}</h2>
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
                  const deadline = groupBy !== 'deadline' ? formatPrintDeadline(task.deadline, t, locale) : null

                  return (
                    <div key={task.id} className="flex items-start gap-2 pl-1 text-sm">
                      <span className="inline-block w-3.5 h-3.5 border border-gray-400 rounded-sm mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div>
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
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {totalTasks === 0 && (
            <p className="text-center text-muted-foreground py-4">
              {t('print.noIncompleteTasks')}
            </p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportWord}
              disabled={totalTasks === 0}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {t('export.wordButton')}
            </Button>
            <Button onClick={handlePrint} disabled={totalTasks === 0}>
              {t('print.printButton')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
