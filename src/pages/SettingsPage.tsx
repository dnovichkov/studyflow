import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNotifications } from '@/hooks/useNotifications'

export function SettingsPage() {
  const navigate = useNavigate()
  const {
    permission,
    settings,
    loading,
    isSupported,
    requestPermission,
    updateSettings,
  } = useNotifications()

  const [localSettings, setLocalSettings] = useState(settings)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleEnableNotifications = async () => {
    if (permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) return
    }

    setLocalSettings((prev) => ({ ...prev, enabled: true }))
  }

  const handleDisableNotifications = () => {
    setLocalSettings((prev) => ({ ...prev, enabled: false }))
  }

  const handleSave = async () => {
    setSaving(true)
    await updateSettings(localSettings)
    setSaving(false)
  }

  const hasChanges =
    localSettings.enabled !== settings.enabled ||
    localSettings.hoursBeforeDeadline !== settings.hoursBeforeDeadline ||
    localSettings.emailEnabled !== settings.emailEnabled

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            &larr; Назад
          </Button>
          <h1 className="text-xl font-semibold">Настройки</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
            <CardDescription>
              Настройте напоминания о дедлайнах заданий
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isSupported && (
              <div className="p-3 text-sm text-yellow-700 bg-yellow-50 rounded-md dark:bg-yellow-950 dark:text-yellow-300">
                Push-уведомления не поддерживаются в этом браузере
              </div>
            )}

            {isSupported && permission === 'denied' && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                Уведомления заблокированы в браузере. Разрешите их в настройках
                браузера.
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications-enabled" className="text-base">
                  Push-уведомления
                </Label>
                <p className="text-sm text-muted-foreground">
                  Получать напоминания о дедлайнах
                </p>
              </div>
              <Switch
                id="notifications-enabled"
                checked={localSettings.enabled}
                onCheckedChange={(checked) =>
                  checked ? handleEnableNotifications() : handleDisableNotifications()
                }
                disabled={!isSupported || permission === 'denied'}
              />
            </div>

            {localSettings.enabled && (
              <div className="space-y-2">
                <Label htmlFor="hours-before">Напоминать за</Label>
                <Select
                  value={String(localSettings.hoursBeforeDeadline)}
                  onValueChange={(value) =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      hoursBeforeDeadline: Number(value),
                    }))
                  }
                >
                  <SelectTrigger id="hours-before">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 час</SelectItem>
                    <SelectItem value="3">3 часа</SelectItem>
                    <SelectItem value="6">6 часов</SelectItem>
                    <SelectItem value="12">12 часов</SelectItem>
                    <SelectItem value="24">1 день</SelectItem>
                    <SelectItem value="48">2 дня</SelectItem>
                    <SelectItem value="72">3 дня</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-enabled" className="text-base">
                  Email-уведомления
                </Label>
                <p className="text-sm text-muted-foreground">
                  Дублировать напоминания на email
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={localSettings.emailEnabled}
                onCheckedChange={(checked) =>
                  setLocalSettings((prev) => ({ ...prev, emailEnabled: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {hasChanges && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
