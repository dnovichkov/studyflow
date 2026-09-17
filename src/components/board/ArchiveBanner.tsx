import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArchiveIcon, GraduationCapIcon, RotateCcwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBoardStore } from '@/stores/boardStore'
import { NewYearDialog } from './NewYearDialog'
import { getSafeErrorMessage } from '@/lib/errorMessages'

/**
 * Показывается на архивной доске. Объясняет, почему ничего не редактируется,
 * и даёт владельцу выход: вернуть доску или завести новый учебный год.
 */
export function ArchiveBanner() {
  const { t } = useTranslation()
  const { board, userRole, unarchiveBoard } = useBoardStore()
  const [newYearOpen, setNewYearOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!board?.archivedAt) return null

  const isOwner = userRole === 'owner'

  const handleUnarchive = async () => {
    setBusy(true)
    setError(null)
    try {
      await unarchiveBoard(board.id)
    } catch (err) {
      setError(getSafeErrorMessage(err, 'archive.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="mx-4 mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <ArchiveIcon className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              {t('archive.bannerTitle')}
            </p>
            <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
              {board.schoolYear
                ? t('archive.bannerDescription', { year: board.schoolYear })
                : t('archive.bannerDescriptionNoYear')}
            </p>
          </div>

          {isOwner && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setNewYearOpen(true)}>
                <GraduationCapIcon className="mr-2 h-4 w-4" />
                {t('archive.startNewYear')}
              </Button>
              <Button size="sm" variant="outline" onClick={handleUnarchive} disabled={busy}>
                <RotateCcwIcon className="mr-2 h-4 w-4" />
                {t('archive.unarchive')}
              </Button>
            </div>
          )}
        </div>

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      <NewYearDialog open={newYearOpen} onOpenChange={setNewYearOpen} />
    </>
  )
}
