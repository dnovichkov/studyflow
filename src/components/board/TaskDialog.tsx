import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBoardStore } from '@/stores/boardStore'
import { useAuth } from '@/hooks/useAuth'
import type { Task, Priority } from '@/types'
import { PRIORITY_LABELS } from '@/types'
import { Plus } from 'lucide-react'

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  columnId: string
  canEdit?: boolean
}

export function TaskDialog({ open, onOpenChange, task, columnId, canEdit = true }: TaskDialogProps) {
  const { subjects, tasks, addTask, updateTask, deleteTask, addSubject } = useBoardStore()
  const { user } = useAuth()
  const isEditing = !!task
  const readOnly = !canEdit && isEditing

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subjectId, setSubjectId] = useState<string>('none')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [isRepeat, setIsRepeat] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewSubject, setShowNewSubject] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title)
        setDescription(task.description || '')
        setSubjectId(task.subjectId || 'none')
        setDeadline(task.deadline ? task.deadline.slice(0, 16) : '')
        setPriority(task.priority)
        setIsRepeat(task.isRepeat ?? false)
      } else {
        setTitle('')
        setDescription('')
        setSubjectId('none')
        setDeadline('')
        setPriority('medium')
        setIsRepeat(false)
      }
      setError(null)
      setShowNewSubject(false)
      setNewSubjectName('')
    }
  }, [open, task])

  const handleAddNewSubject = async () => {
    if (!newSubjectName.trim() || !user?.id) return

    try {
      const newSubject = await addSubject(user.id, newSubjectName.trim())
      setSubjectId(newSubject.id)
      setShowNewSubject(false)
      setNewSubjectName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания предмета')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Введите название задания')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const subjectValue = subjectId === 'none' ? null : subjectId

      if (isEditing && task) {
        await updateTask(task.id, {
          title: title.trim(),
          description: description.trim() || null,
          subjectId: subjectValue,
          deadline: deadline || null,
          priority,
          isRepeat,
        })
      } else {
        const columnTasks = tasks.filter((t) => t.columnId === columnId)
        const maxPosition = columnTasks.length > 0
          ? Math.max(...columnTasks.map((t) => t.position))
          : -1

        await addTask({
          columnId,
          title: title.trim(),
          description: description.trim() || null,
          subjectId: subjectValue,
          deadline: deadline || null,
          priority,
          position: maxPosition + 1,
          isRepeat,
        })
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!task || !confirm('Удалить это задание?')) return

    setLoading(true)
    try {
      await deleteTask(task.id)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Редактировать задание' : 'Новое задание'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Название {!readOnly && '*'}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что нужно сделать?"
              disabled={loading || readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробности задания..."
              rows={3}
              disabled={loading || readOnly}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Предмет</Label>
              {showNewSubject ? (
                <div className="flex gap-2">
                  <Input
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="Название предмета"
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddNewSubject()
                      }
                      if (e.key === 'Escape') {
                        setShowNewSubject(false)
                        setNewSubjectName('')
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={handleAddNewSubject}
                    disabled={loading || !newSubjectName.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Select
                  value={subjectId}
                  onValueChange={(value) => {
                    if (value === 'new') {
                      setShowNewSubject(true)
                    } else {
                      setSubjectId(value)
                    }
                  }}
                  disabled={loading || readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без предмета</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          {s.color && (
                            <span
                              className="w-3 h-3 rounded-full inline-block"
                              style={{ backgroundColor: s.color }}
                            />
                          )}
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                    <SelectItem value="new" className="text-primary">
                      <span className="flex items-center gap-2">
                        <Plus className="h-3 w-3" />
                        Добавить предмет...
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Приоритет</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as Priority)}
                disabled={loading || readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Дедлайн</Label>
            <div className="flex gap-2">
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={loading || readOnly}
                className="flex-1"
              />
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const tomorrow = new Date()
                    tomorrow.setDate(tomorrow.getDate() + 1)
                    tomorrow.setHours(23, 59, 0, 0)
                    const formatted = tomorrow.toISOString().slice(0, 16)
                    setDeadline(formatted)
                  }}
                  disabled={loading}
                >
                  На завтра
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isRepeat"
              checked={isRepeat}
              onCheckedChange={(checked) => setIsRepeat(checked === true)}
              disabled={loading || readOnly}
            />
            <Label htmlFor="isRepeat" className="text-sm font-normal cursor-pointer">
              Повторять (задание будет перемещено в колонку "Повторить" после выполнения)
            </Label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {isEditing && !readOnly && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                className="mr-auto"
              >
                Удалить
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? 'Закрыть' : 'Отмена'}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={loading}>
                {loading ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
