import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

interface NotificationSettings {
  enabled: boolean
  hoursBeforeDeadline: number
  emailEnabled: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  hoursBeforeDeadline: 24,
  emailEnabled: false,
}

export function useNotifications() {
  const { user } = useAuth()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!error && data) {
        setSettings({
          enabled: data.notifications_enabled ?? false,
          hoursBeforeDeadline: data.hours_before_deadline ?? 24,
          emailEnabled: data.email_notifications ?? false,
        })
      }
    } catch {
      // Settings don't exist yet, use defaults
    } finally {
      setLoading(false)
    }
  }

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch {
      return false
    }
  }, [])

  const updateSettings = useCallback(
    async (newSettings: Partial<NotificationSettings>): Promise<boolean> => {
      if (!user) return false

      const updated = { ...settings, ...newSettings }
      setSettings(updated)

      try {
        const { error } = await supabase.from('user_settings').upsert({
          user_id: user.id,
          notifications_enabled: updated.enabled,
          hours_before_deadline: updated.hoursBeforeDeadline,
          email_notifications: updated.emailEnabled,
          updated_at: new Date().toISOString(),
        })

        return !error
      } catch {
        return false
      }
    },
    [user, settings]
  )

  const sendLocalNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== 'granted') return

      try {
        new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        })
      } catch {
        // Notification failed
      }
    },
    [permission]
  )

  const isSupported = 'Notification' in window

  return {
    permission,
    settings,
    loading,
    isSupported,
    requestPermission,
    updateSettings,
    sendLocalNotification,
  }
}
