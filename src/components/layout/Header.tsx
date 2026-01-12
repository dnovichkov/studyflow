import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MenuIcon, MoonIcon, SunIcon, PrinterIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ShareDialog } from '@/components/board/ShareDialog'
import { PrintDialog } from '@/components/board/PrintDialog'
import { BoardSwitcher } from '@/components/board/BoardSwitcher'
import { useAuth } from '@/hooks/useAuth'
import { useBoardStore } from '@/stores/boardStore'
import { useTheme } from '@/hooks/useTheme'

export function Header() {
  const { user, signOut } = useAuth()
  const { board } = useBoardStore()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [shareOpen, setShareOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleMobileNav = (path: string) => {
    navigate(path)
    setMobileMenuOpen(false)
  }

  return (
    <header className="border-b bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">StudyFlow</h1>
          {board && (
            <>
              <span className="text-muted-foreground">/</span>
              <BoardSwitcher />
            </>
          )}
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-2">
          {board && (
            <>
              <Button variant="outline" size="sm" onClick={() => setPrintOpen(true)}>
                <PrinterIcon className="h-4 w-4 mr-2" />
                Печать
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                Поделиться
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={isDark ? 'Светлая тема' : 'Темная тема'}
          >
            {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                {user?.email}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Настройки
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile navigation */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={isDark ? 'Светлая тема' : 'Темная тема'}
          >
            {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </Button>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <MenuIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle>Меню</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-6">
                <div className="text-sm text-muted-foreground px-2">
                  {user?.email}
                </div>

                {board && (
                  <>
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        setPrintOpen(true)
                      }}
                    >
                      <PrinterIcon className="h-4 w-4 mr-2" />
                      Печать заданий
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        setShareOpen(true)
                      }}
                    >
                      Поделиться доской
                    </Button>
                  </>
                )}

                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => handleMobileNav('/board')}
                >
                  Доска
                </Button>

                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => handleMobileNav('/settings')}
                >
                  Настройки
                </Button>

                <div className="border-t pt-4 mt-auto">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleSignOut()
                    }}
                  >
                    Выйти
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {board && (
        <>
          <ShareDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            boardId={board.id}
          />
          <PrintDialog
            open={printOpen}
            onOpenChange={setPrintOpen}
          />
        </>
      )}
    </header>
  )
}
