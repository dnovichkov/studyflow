import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useBoardStore } from '@/stores/boardStore'
import type { Task, Subject } from '@/types'
import { PRIORITY_COLORS } from '@/types'
import { cn } from '@/lib/utils'

interface WeekViewProps {
  onTaskClick: (task: Task) => void
}

export function WeekView({ onTaskClick }: WeekViewProps) {
  const { t, i18n } = useTranslation()
  const { tasks, subjects } = useBoardStore()
  const [weekOffset, setWeekOffset] = useState(0)

  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US'

  const weekDays = useMemo(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7)

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      return date
    })
  }, [weekOffset])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>()

    tasks.forEach((task) => {
      if (task.deadline) {
        const dateKey = new Date(task.deadline).toDateString()
        const existing = map.get(dateKey) || []
        map.set(dateKey, [...existing, task])
      }
    })

    return map
  }, [tasks])

  const getSubject = (subjectId: string | null): Subject | undefined => {
    return subjects.find((s) => s.id === subjectId)
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const getLoadLevel = (count: number): string => {
    if (count === 0) return ''
    if (count <= 2) return 'bg-green-50 dark:bg-green-950'
    if (count <= 4) return 'bg-yellow-50 dark:bg-yellow-950'
    return 'bg-red-50 dark:bg-red-950'
  }

  const formatWeekRange = (): string => {
    const start = weekDays[0]
    const end = weekDays[6]
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }

    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.toLocaleDateString(locale, options)}`
    }
    return `${start.toLocaleDateString(locale, options)} - ${end.toLocaleDateString(locale, options)}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{formatWeekRange()}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((o) => o - 1)}
          >
            {t('calendar.back')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            {t('calendar.today')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            {t('calendar.forward')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 overflow-x-auto">
        {weekDays.map((date) => {
          const dayTasks = tasksByDay.get(date.toDateString()) || []
          const dayName = date.toLocaleDateString(locale, { weekday: 'short' })
          const dayNum = date.getDate()

          return (
            <div
              key={date.toISOString()}
              className={cn(
                'min-h-[150px] rounded-lg border p-2',
                getLoadLevel(dayTasks.length),
                isToday(date) && 'ring-2 ring-primary'
              )}
            >
              <div className="text-center mb-2">
                <div className="text-xs text-muted-foreground uppercase">
                  {dayName}
                </div>
                <div
                  className={cn(
                    'text-lg font-medium',
                    isToday(date) && 'text-primary'
                  )}
                >
                  {dayNum}
                </div>
              </div>

              <div className="space-y-1">
                {dayTasks.slice(0, 4).map((task) => {
                  const subject = getSubject(task.subjectId)
                  return (
                    <Card
                      key={task.id}
                      className={cn(
                        'p-1.5 cursor-pointer hover:shadow-sm text-xs',
                        PRIORITY_COLORS[task.priority]
                      )}
                      onClick={() => onTaskClick(task)}
                    >
                      <div className="truncate font-medium">{task.title}</div>
                      {subject && (
                        <div className="truncate text-muted-foreground">
                          {subject.name}
                        </div>
                      )}
                    </Card>
                  )
                })}
                {dayTasks.length > 4 && (
                  <div className="text-xs text-center text-muted-foreground">
                    {t('calendar.more', { count: dayTasks.length - 4 })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
