import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'
import { useBoardStore } from '@/stores/boardStore'
import { useAuth } from '@/hooks/useAuth'
import { getSafeErrorMessage } from '@/lib/errorMessages'
import { formatSchoolYear, suggestSchoolYearStart } from '@/lib/schoolYear'
import { devError } from '@/lib/logger'

interface NewYearDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewYearDialog({ open, onOpenChange }: NewYearDialogProps) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { board, subjects, startNewSchoolYear } = useBoardStore()

  const [title, setTitle] = useState('')
  const [schoolYear, setSchoolYear] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [carryOverTasks, setCarryOverTasks] = useState(false)
  const [copyMembers, setCopyMembers] = useState(true)
  const [archiveSource, setArchiveSource] = useState(true)
  const [memberCount, setMemberCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Форма сбрасывается при каждом открытии. Предметы читаем через getState,
  // а не из замыкания: массив subjects пересоздаётся на каждое обновление
  // стора, и в списке зависимостей он сбрасывал бы выбор пользователя.
  useEffect(() => {
    if (!open) return

    const startYear = suggestSchoolYearStart()
    setTitle(formatSchoolYear(startYear, i18n.language))
    setSchoolYear(`${startYear}/${startYear + 1}`)
    const state = useBoardStore.getState()
    setSelectedSubjects(state.subjects.map((s) => s.id))
    setCarryOverTasks(false)
    setCopyMembers(true)
    // Мастер можно открыть и из архивной доски — архивировать её повторно нечего
    setArchiveSource(!state.board?.archivedAt)
    setError(null)
  }, [open, i18n.language])

  // Участников показываем счётчиком, а не списком: board_members хранит
  // только user_id, а раскрывать чужие email ради галочки не стоит
  useEffect(() => {
    if (!open || !board) return

    let cancelled = false
    supabase
      .from('board_members')
      .select('id', { count: 'exact', head: true })
      .eq('board_id', board.id)
      .then(({ count, error: countError }) => {
        if (cancelled) return
        if (countError) devError('Failed to count board members:', countError)
        setMemberCount(count ?? 0)
      })

    return () => {
      cancelled = true
    }
  }, [open, board])

  const toggleSubject = (id: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    if (!user || !board) return

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError(t('newYear.titleRequired'))
      return
    }

    setSaving(true)
    setError(null)
    try {
      await startNewSchoolYear(user.id, {
        title: trimmedTitle,
        schoolYear,
        // null вместо полного списка — так RPC не зависит от того,
        // не добавился ли предмет между открытием диалога и отправкой
        subjectIds:
          selectedSubjects.length === subjects.length ? null : selectedSubjects,
        carryOverTasks,
        copyMembers,
        archiveSource,
      })
      onOpenChange(false)
    } catch (err) {
      setError(getSafeErrorMessage(err, 'newYear.error'))
    } finally {
      setSaving(false)
    }
  }

  if (!board) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('newYear.title')}</DialogTitle>
          <DialogDescription>{t('newYear.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="new-year-title">{t('newYear.titleLabel')}</Label>
            <Input
              id="new-year-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('newYear.titlePlaceholder')}
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('newYear.subjectsLabel')}</Label>
              {subjects.length > 0 && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() =>
                    setSelectedSubjects(
                      selectedSubjects.length === subjects.length
                        ? []
                        : subjects.map((s) => s.id)
                    )
                  }
                >
                  {selectedSubjects.length === subjects.length
                    ? t('newYear.clearAll')
                    : t('newYear.selectAll')}
                </Button>
              )}
            </div>

            {subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('newYear.noSubjects')}</p>
            ) : (
              <>
                <div className="max-h-52 overflow-y-auto rounded-md border p-2 space-y-1">
                  {subjects.map((subject) => (
                    <label
                      key={subject.id}
                      className="flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:bg-accent"
                    >
                      <Checkbox
                        checked={selectedSubjects.includes(subject.id)}
                        onCheckedChange={() => toggleSubject(subject.id)}
                      />
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: subject.color || 'transparent' }}
                      />
                      <span className="text-sm">{subject.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('newYear.subjectsSelected', {
                    count: selectedSubjects.length,
                    total: subjects.length,
                  })}
                </p>
              </>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                className="mt-0.5"
                checked={carryOverTasks}
                onCheckedChange={(checked) => setCarryOverTasks(checked === true)}
              />
              <span>
                <span className="text-sm">{t('newYear.carryOverTasks')}</span>
                <span className="block text-xs text-muted-foreground">
                  {t('newYear.carryOverTasksHint')}
                </span>
              </span>
            </label>

            {memberCount > 0 && (
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  className="mt-0.5"
                  checked={copyMembers}
                  onCheckedChange={(checked) => setCopyMembers(checked === true)}
                />
                <span>
                  <span className="text-sm">{t('newYear.copyMembers')}</span>
                  <span className="block text-xs text-muted-foreground">
                    {t('newYear.copyMembersHint', { count: memberCount })}
                  </span>
                </span>
              </label>
            )}

            {!board.archivedAt && (
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  className="mt-0.5"
                  checked={archiveSource}
                  onCheckedChange={(checked) => setArchiveSource(checked === true)}
                />
                <span>
                  <span className="text-sm">
                    {t('newYear.archiveSource', { title: board.title })}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t('newYear.archiveSourceHint')}
                  </span>
                </span>
              </label>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? t('newYear.submitting') : t('newYear.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
