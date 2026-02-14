import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react'
import { useBoardStore, SUBJECT_COLORS } from '@/stores/boardStore'
import { getSafeErrorMessage } from '@/lib/errorMessages'

interface SubjectsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SubjectsDialog({ open, onOpenChange }: SubjectsDialogProps) {
  const { t } = useTranslation()
  const { board, subjects, tasks, userRole, addSubject, updateSubject, deleteSubject } = useBoardStore()
  const canEdit = userRole === 'owner' || userRole === 'editor'

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<string>('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(SUBJECT_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getTaskCount = (subjectId: string) =>
    tasks.filter((t) => t.subjectId === subjectId).length

  const startEdit = (subject: { id: string; name: string; color: string | null }) => {
    setEditingId(subject.id)
    setEditName(subject.name)
    setEditColor(subject.color || SUBJECT_COLORS[0])
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('')
    setError(null)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return
    if (editName.trim().length > 100) {
      setError(t('errors.nameTooLong'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await updateSubject(editingId, { name: editName.trim(), color: editColor })
      setEditingId(null)
    } catch (err) {
      setError(getSafeErrorMessage(err, 'subjects.saveError'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    const count = getTaskCount(id)
    const message = count > 0
      ? t('subjects.deleteConfirmWithTasks', { name, count, taskWord: t('subjects.taskWord', { count }) })
      : t('subjects.deleteConfirm', { name })

    if (!confirm(message)) return

    setLoading(true)
    setError(null)
    try {
      await deleteSubject(id)
      if (editingId === id) setEditingId(null)
    } catch (err) {
      setError(getSafeErrorMessage(err, 'subjects.deleteError'))
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newName.trim() || !board?.id) return
    if (newName.trim().length > 100) {
      setError(t('errors.nameTooLong'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await addSubject(board.id, newName.trim(), newColor)
      setNewName('')
      setNewColor(SUBJECT_COLORS[(subjects.length + 1) % SUBJECT_COLORS.length])
      setAdding(false)
    } catch (err) {
      setError(getSafeErrorMessage(err, 'subjects.createError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('subjects.title')}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {subjects.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t('subjects.noSubjects')}
            </p>
          )}

          {subjects.map((subject) => (
            <div key={subject.id}>
              {editingId === subject.id ? (
                <div className="space-y-3 p-3 rounded-lg border bg-muted/50">
                  <div className="flex gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={t('subjects.subjectNamePlaceholder')}
                      maxLength={100}
                      disabled={loading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={handleSaveEdit} disabled={loading || !editName.trim()}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelEdit} disabled={loading}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {SUBJECT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor: editColor === color ? 'var(--foreground)' : 'transparent',
                        }}
                        onClick={() => setEditColor(color)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 group">
                  <span
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: subject.color || '#e5e7eb' }}
                  />
                  <span className="flex-1 text-sm font-medium truncate">
                    {subject.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {t('subjects.taskCount', { count: getTaskCount(subject.id) })}
                  </span>
                  {canEdit && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(subject)}
                        disabled={loading}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(subject.id, subject.name)}
                        disabled={loading}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {canEdit && (
          <>
            {adding ? (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/50">
                <div className="flex gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t('subjects.subjectNamePlaceholder')}
                    maxLength={100}
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdd()
                      if (e.key === 'Escape') {
                        setAdding(false)
                        setNewName('')
                      }
                    }}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={handleAdd} disabled={loading || !newName.trim()}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setAdding(false); setNewName('') }} disabled={loading}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {SUBJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color,
                        borderColor: newColor === color ? 'var(--foreground)' : 'transparent',
                      }}
                      onClick={() => setNewColor(color)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setAdding(true)
                  setNewColor(SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length])
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('subjects.addSubject')}
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
