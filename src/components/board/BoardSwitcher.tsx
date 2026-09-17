import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArchiveIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GraduationCapIcon,
  LogOutIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { NewYearDialog } from '@/components/board/NewYearDialog'
import { useBoardStore } from '@/stores/boardStore'
import { useAuth } from '@/hooks/useAuth'

function getOwnerName(email?: string): string {
  if (!email) return ''
  return email.split('@')[0]
}

export function BoardSwitcher() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { board, availableBoards, userRole, switchBoard, leaveBoard, archiveBoard } =
    useBoardStore()
  const [showArchived, setShowArchived] = useState(false)
  const [newYearOpen, setNewYearOpen] = useState(false)

  const currentBoard = availableBoards.find((b) => b.id === board?.id)
  const currentOwnerName =
    currentBoard && !currentBoard.isOwner ? getOwnerName(currentBoard.ownerEmail) : null
  const isOwner = userRole === 'owner'

  const activeOwnBoards = availableBoards.filter((b) => b.isOwner && !b.archivedAt)
  const activeSharedBoards = availableBoards.filter((b) => !b.isOwner && !b.archivedAt)
  const archivedBoards = availableBoards
    .filter((b) => b.archivedAt)
    .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''))

  const currentLabel = (
    <>
      <div className="flex flex-col items-start">
        <span className="font-medium">{board?.title || t('common.loading')}</span>
        {currentOwnerName && (
          <span className="text-xs text-muted-foreground">
            {t('boardSwitcher.from', { name: currentOwnerName })}
          </span>
        )}
      </div>
      {board?.archivedAt && (
        <Badge variant="outline" className="text-xs">
          {t('archive.badge')}
        </Badge>
      )}
      {userRole !== 'owner' && (
        <Badge variant="secondary" className="text-xs">
          {t(`boardSwitcher.role.${userRole}`)}
        </Badge>
      )}
    </>
  )

  // Меню нужно даже с одной доской: владельцу через него доступен новый учебный год
  const hasMenu = Boolean(board) && (availableBoards.length > 1 || isOwner)

  if (!hasMenu) {
    return <div className="flex items-center gap-2">{currentLabel}</div>
  }

  const handleSwitch = async (boardId: string) => {
    if (user && boardId !== board?.id) {
      await switchBoard(user.id, boardId)
    }
  }

  const handleArchive = async (boardId: string, title: string) => {
    if (!user) return
    if (!confirm(t('archive.archiveConfirm', { title }))) return
    await archiveBoard(user.id, boardId)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 h-auto py-1 px-2">
            {currentLabel}
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {activeOwnBoards.length > 0 && (
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t('boardSwitcher.myBoards')}</DropdownMenuLabel>
              {activeOwnBoards.map((b) => (
                <DropdownMenuItem
                  key={b.id}
                  onClick={() => handleSwitch(b.id)}
                  className={b.id === board?.id ? 'bg-accent' : ''}
                >
                  <span className="truncate">{b.title}</span>
                  <button
                    className="ml-auto shrink-0 rounded p-0.5 transition-colors hover:bg-accent-foreground/10"
                    title={t('archive.archiveBoard')}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleArchive(b.id, b.title)
                    }}
                  >
                    <ArchiveIcon className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )}

          {activeOwnBoards.length > 0 && activeSharedBoards.length > 0 && (
            <DropdownMenuSeparator />
          )}

          {activeSharedBoards.length > 0 && (
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t('boardSwitcher.sharedBoards')}</DropdownMenuLabel>
              {activeSharedBoards.map((b) => {
                const ownerName = getOwnerName(b.ownerEmail)
                return (
                  <DropdownMenuItem
                    key={b.id}
                    onClick={() => handleSwitch(b.id)}
                    className={`flex flex-col items-start gap-0.5 ${b.id === board?.id ? 'bg-accent' : ''}`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="truncate">{b.title}</span>
                      <Badge variant="outline" className="text-xs ml-auto shrink-0">
                        {t(`boardSwitcher.role.${b.role}`)}
                      </Badge>
                      <button
                        className="shrink-0 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
                        title={t('boardSwitcher.leaveBoard')}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (user && confirm(t('boardSwitcher.leaveBoardConfirm', { title: b.title }))) {
                            leaveBoard(user.id, b.id)
                          }
                        }}
                      >
                        <LogOutIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {ownerName && (
                      <span className="text-xs text-muted-foreground">
                        {t('boardSwitcher.from', { name: ownerName })}
                      </span>
                    )}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
          )}

          {archivedBoards.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-muted-foreground"
                // Без preventDefault Radix закроет меню сразу после раскрытия
                onSelect={(e) => {
                  e.preventDefault()
                  setShowArchived((prev) => !prev)
                }}
              >
                {showArchived ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4" />
                )}
                {t('archive.section')} ({archivedBoards.length})
              </DropdownMenuItem>

              {showArchived &&
                archivedBoards.map((b) => (
                  <DropdownMenuItem
                    key={b.id}
                    onClick={() => handleSwitch(b.id)}
                    className={`pl-8 text-muted-foreground ${b.id === board?.id ? 'bg-accent' : ''}`}
                  >
                    <span className="truncate">{b.schoolYear || b.title}</span>
                    {!b.isOwner && (
                      <Badge variant="outline" className="text-xs ml-auto shrink-0">
                        {t(`boardSwitcher.role.${b.role}`)}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
            </>
          )}

          {isOwner && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setNewYearOpen(true)}>
                <GraduationCapIcon className="h-4 w-4" />
                {t('newYear.menuItem')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <NewYearDialog open={newYearOpen} onOpenChange={setNewYearOpen} />
    </>
  )
}
