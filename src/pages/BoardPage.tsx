import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Board } from '@/components/board/Board'
import { WeekView } from '@/components/calendar/WeekView'
import { TaskDialog } from '@/components/board/TaskDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBoardStore } from '@/stores/boardStore'
import { useAuth } from '@/hooks/useAuth'
import { useRealtime } from '@/hooks/useRealtime'
import type { Task } from '@/types'

export function BoardPage() {
  const { user } = useAuth()
  const { board, columns, userRole, loading, error, fetchBoard } = useBoardStore()
  const canEdit = userRole === 'owner' || userRole === 'editor'

  useRealtime(board?.id)

  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedColumnId, setSelectedColumnId] = useState<string>('')

  useEffect(() => {
    if (user?.id) {
      fetchBoard(user.id)
    }
  }, [user?.id, fetchBoard])

  const handleAddTask = (columnId: string) => {
    setSelectedTask(null)
    setSelectedColumnId(columnId)
    setTaskDialogOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setSelectedColumnId(task.columnId)
    setTaskDialogOpen(true)
  }

  const handleCalendarTaskClick = (task: Task) => {
    setSelectedTask(task)
    setSelectedColumnId(task.columnId)
    setTaskDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-60px)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-60px)]">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <button
              onClick={() => user?.id && fetchBoard(user.id)}
              className="text-primary hover:underline"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    )
  }

  const defaultColumnId = columns[0]?.id || ''

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-4">
        <Tabs defaultValue="board" className="w-full">
          <div className="px-4 mb-4">
            <TabsList>
              <TabsTrigger value="board">Доска</TabsTrigger>
              <TabsTrigger value="calendar">Календарь</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="board" className="mt-0">
            <Board onAddTask={handleAddTask} onEditTask={handleEditTask} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-0 px-4">
            <WeekView onTaskClick={handleCalendarTaskClick} />
          </TabsContent>
        </Tabs>
      </main>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedTask}
        columnId={selectedColumnId || defaultColumnId}
        canEdit={canEdit}
      />
    </div>
  )
}
