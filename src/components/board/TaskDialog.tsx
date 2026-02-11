import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
import type { Task, Priority } from '@/types'
import { Plus, X } from 'lucide-react'

const PRIORITIES: Priority[] = ['low', 'medium', 'high']

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  columnId: string
  canEdit?: boolean
}

export function TaskDialog({ open, onOpenChange, task, columnId, canEdit = true }: TaskDialogProps) {
  const { t } = useTranslation()
  const { board, subjects, tasks, addTask, updateTask, deleteTask, addSubject } = useBoardStore()
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
    if (!newSubjectName.trim() || !board?.id) return

    try {
      const newSubject = await addSubject(board.id, newSubjectName.trim())
      setSubjectId(newSubject.id)
      setShowNewSubject(false)
      setNewSubjectName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('task.subjectCreateError'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError(t('task.titleRequired'))
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
          completedAt: null,
        })
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('task.saveError'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!task || !confirm(t('task.deleteConfirm'))) return

    setLoading(true)
    try {
      await deleteTask(task.id)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('task.deleteError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('task.editTask') : t('task.newTask')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">{t('task.titleLabel')} {!readOnly && '*'}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('task.titlePlaceholder')}
              disabled={loading || readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('task.descriptionLabel')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('task.descriptionPlaceholder')}
              rows={3}
              disabled={loading || readOnly}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">{t('task.subjectLabel')}</Label>
              {showNewSubject ? (
                <div className="flex gap-2">
                  <Input
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder={t('task.subjectNamePlaceholder')}
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
                    <SelectValue placeholder={t('task.subjectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('task.noSubject')}</SelectItem>
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
                        {t('task.addSubject')}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">{t('task.priorityLabel')}</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as Priority)}
                disabled={loading || readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`task.priority.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">{t('task.deadlineLabel')}</Label>
            <div className="flex gap-2">
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={loading || readOnly}
                className="flex-1"
              />
              {!readOnly && deadline && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setDeadline('')}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
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
                  {t('task.deadlineTomorrow')}
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
              {t('task.repeatLabel')}
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
                {t('common.delete')}
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? t('common.close') : t('common.cancel')}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={loading}>
                {loading ? t('common.saving') : isEditing ? t('common.save') : t('task.create')}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
