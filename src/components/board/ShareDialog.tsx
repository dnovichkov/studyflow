import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
}

interface Invite {
  id: string
  code: string
  role: string
  expiresAt: string
  useCount: number
  maxUses: number | null
}

export function ShareDialog({ open, onOpenChange, boardId }: ShareDialogProps) {
  const { t } = useTranslation()
  const [invites, setInvites] = useState<Invite[]>([])
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (open && boardId) {
      fetchInvites()
    }
  }, [open, boardId])

  const fetchInvites = async () => {
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .eq('board_id', boardId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (!error && data) {
      setInvites(
        data.map((inv) => ({
          id: inv.id,
          code: inv.code,
          role: inv.role,
          expiresAt: inv.expires_at,
          useCount: inv.use_count,
          maxUses: inv.max_uses,
        }))
      )
    }
  }

  const generateInvite = async () => {
    setLoading(true)
    try {
      const code = generateCode()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { data: userData } = await supabase.auth.getUser()

      const { error } = await supabase.from('invites').insert({
        board_id: boardId,
        code,
        role,
        created_by: userData.user?.id,
        expires_at: expiresAt.toISOString(),
        max_uses: 10,
      })

      if (error) throw error
      await fetchInvites()
    } catch (err) {
      console.error('Error creating invite:', err)
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async (code: string, id: string) => {
    const link = `${window.location.origin}/invite/${code}`
    await navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const deleteInvite = async (id: string) => {
    await supabase.from('invites').delete().eq('id', id)
    await fetchInvites()
  }

  const getRoleLabel = (role: string): string => {
    return role === 'editor' ? t('share.roleEditor') : t('share.roleViewer')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('share.title')}</DialogTitle>
          <DialogDescription>
            {t('share.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="role">{t('share.roleLabel')}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'editor' | 'viewer')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">{t('share.roleEditor')}</SelectItem>
                  <SelectItem value="viewer">{t('share.roleViewer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={generateInvite} disabled={loading}>
                {loading ? t('share.creating') : t('share.createLink')}
              </Button>
            </div>
          </div>

          {invites.length > 0 && (
            <div className="space-y-2">
              <Label>{t('share.activeInvites')}</Label>
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-2 p-2 rounded border bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {getRoleLabel(invite.role)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('share.used')}: {invite.useCount}/{invite.maxUses || 'Unlimited'}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyLink(invite.code, invite.id)}
                  >
                    {copiedId === invite.id ? t('share.copied') : t('share.copy')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteInvite(invite.id)}
                  >
                    X
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
