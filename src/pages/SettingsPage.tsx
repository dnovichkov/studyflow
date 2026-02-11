import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

const TIME_OPTIONS = ['1', '3', '6', '12', '24', '48', '72'] as const

export function SettingsPage() {
  const { t } = useTranslation()
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
            &larr; {t('common.back')}
          </Button>
          <h1 className="text-xl font-semibold">{t('settings.title')}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.notifications')}</CardTitle>
            <CardDescription>
              {t('settings.notificationsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isSupported && (
              <div className="p-3 text-sm text-yellow-700 bg-yellow-50 rounded-md dark:bg-yellow-950 dark:text-yellow-300">
                {t('settings.pushNotSupported')}
              </div>
            )}

            {isSupported && permission === 'denied' && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {t('settings.pushBlocked')}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications-enabled" className="text-base">
                  {t('settings.pushNotifications')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.pushDescription')}
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
                <Label htmlFor="hours-before">{t('settings.remindBefore')}</Label>
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
                    {TIME_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`settings.time.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-enabled" className="text-base">
                  {t('settings.emailNotifications')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('settings.emailDescription')}
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
              {saving ? t('common.saving') : t('settings.saveChanges')}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
