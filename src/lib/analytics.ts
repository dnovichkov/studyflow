import { supabase } from './supabase'
import { env } from './env'
import { devError } from './logger'

type EventName =
  | 'task_created'
  | 'task_completed'
  | 'task_deleted'
  | 'board_shared'
  | 'invite_accepted'
  | 'export_word'
  | 'view_calendar'
  | 'subject_created'
  | 'settings_changed'

/** Dynamically injects the Umami tracking script if UMAMI_WEBSITE_ID is configured */
export function initAnalytics(): void {
  const websiteId = env.UMAMI_WEBSITE_ID
  if (!websiteId) return

  const script = document.createElement('script')
  script.defer = true
  script.src = '/umami/script.js'
  script.dataset.websiteId = websiteId
  document.head.appendChild(script)
}

/** Fire-and-forget event tracking to both Umami and Supabase */
export function trackEvent(name: EventName, metadata?: Record<string, string | number | boolean>): void {
  // Umami custom event
  try {
    window.umami?.track(name, metadata)
  } catch {
    // silently ignore
  }

  // Supabase product event
  supabase
    .rpc('track_event', {
      p_event_name: name,
      p_metadata: metadata ?? {},
    })
    .then(({ error }) => {
      if (error) devError('Analytics event failed:', error)
    })
}
