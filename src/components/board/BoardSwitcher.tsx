import { ChevronDownIcon, LogOutIcon } from 'lucide-react'
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
import { useBoardStore } from '@/stores/boardStore'
import { useAuth } from '@/hooks/useAuth'

const roleLabels: Record<string, string> = {
  owner: 'Владелец',
  editor: 'Редактор',
  viewer: 'Наблюдатель',
}

function getOwnerName(email?: string): string {
  if (!email) return ''
  return email.split('@')[0]
}

export function BoardSwitcher() {
  const { user } = useAuth()
  const { board, availableBoards, userRole, switchBoard, leaveBoard } = useBoardStore()

  const currentBoard = availableBoards.find((b) => b.id === board?.id)
  const currentOwnerName = currentBoard && !currentBoard.isOwner ? getOwnerName(currentBoard.ownerEmail) : null

  if (!board || availableBoards.length <= 1) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <span className="font-medium">{board?.title || 'Загрузка...'}</span>
          {currentOwnerName && (
            <span className="text-xs text-muted-foreground">от {currentOwnerName}</span>
          )}
        </div>
        {userRole && userRole !== 'owner' && (
          <Badge variant="secondary" className="text-xs">
            {roleLabels[userRole]}
          </Badge>
        )}
      </div>
    )
  }

  const ownBoards = availableBoards.filter((b) => b.isOwner)
  const sharedBoards = availableBoards.filter((b) => !b.isOwner)

  const handleSwitch = async (boardId: string) => {
    if (user && boardId !== board.id) {
      await switchBoard(user.id, boardId)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-auto py-1 px-2">
          <div className="flex flex-col items-start">
            <span className="font-medium">{board.title}</span>
            {currentOwnerName && (
              <span className="text-xs text-muted-foreground">от {currentOwnerName}</span>
            )}
          </div>
          {userRole !== 'owner' && (
            <Badge variant="secondary" className="text-xs">
              {roleLabels[userRole]}
            </Badge>
          )}
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {ownBoards.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Мои доски</DropdownMenuLabel>
            {ownBoards.map((b) => (
              <DropdownMenuItem
                key={b.id}
                onClick={() => handleSwitch(b.id)}
                className={b.id === board.id ? 'bg-accent' : ''}
              >
                {b.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}

        {ownBoards.length > 0 && sharedBoards.length > 0 && <DropdownMenuSeparator />}

        {sharedBoards.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Общие доски</DropdownMenuLabel>
            {sharedBoards.map((b) => {
              const ownerName = getOwnerName(b.ownerEmail)
              return (
                <DropdownMenuItem
                  key={b.id}
                  onClick={() => handleSwitch(b.id)}
                  className={`flex flex-col items-start gap-0.5 ${b.id === board.id ? 'bg-accent' : ''}`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="truncate">{b.title}</span>
                    <Badge variant="outline" className="text-xs ml-auto shrink-0">
                      {roleLabels[b.role]}
                    </Badge>
                    <button
                      className="shrink-0 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-colors"
                      title="Покинуть доску"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (user && confirm(`Покинуть доску «${b.title}»?`)) {
                          leaveBoard(user.id, b.id)
                        }
                      }}
                    >
                      <LogOutIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {ownerName && (
                    <span className="text-xs text-muted-foreground">от {ownerName}</span>
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
