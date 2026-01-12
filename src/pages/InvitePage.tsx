import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function InvitePage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteInfo, setInviteInfo] = useState<{
    boardTitle: string
    role: string
  } | null>(null)

  useEffect(() => {
    if (code) {
      fetchInviteInfo()
    }
  }, [code])

  const fetchInviteInfo = async () => {
    const { data, error } = await supabase
      .from('invites')
      .select(`
        role,
        board:boards(title)
      `)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      setError('Приглашение недействительно или истекло')
      return
    }

    const boardData = data.board as { title: string } | { title: string }[] | null
    const boardTitle = Array.isArray(boardData)
      ? boardData[0]?.title
      : boardData?.title

    setInviteInfo({
      boardTitle: boardTitle || 'Доска',
      role: data.role as string,
    })
  }

  const handleAccept = async () => {
    if (!user) {
      navigate(`/login?redirect=/invite/${code}`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.rpc('accept_invite', {
        invite_code: code,
      })

      if (error) throw error

      const result = data as { error?: string; success?: boolean; board_id?: string }

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.success && result.board_id) {
        // Save the board ID so it opens automatically
        localStorage.setItem('selectedBoardId', result.board_id)
        navigate('/board')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка принятия приглашения')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const getRoleLabel = (role: string): string => {
    return role === 'editor' ? 'редактора' : 'наблюдателя'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Приглашение в StudyFlow</CardTitle>
          {inviteInfo && (
            <CardDescription>
              Вас пригласили в доску "{inviteInfo.boardTitle}" с правами{' '}
              {getRoleLabel(inviteInfo.role)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          {inviteInfo && !error && (
            <>
              {user ? (
                <Button
                  className="w-full"
                  onClick={handleAccept}
                  disabled={loading}
                >
                  {loading ? 'Принятие...' : 'Принять приглашение'}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/login?redirect=/invite/${code}`)}
                  >
                    Войти и принять
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => navigate(`/register?redirect=/invite/${code}`)}
                  >
                    Зарегистрироваться
                  </Button>
                </div>
              )}
            </>
          )}

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate('/')}
          >
            Отмена
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
