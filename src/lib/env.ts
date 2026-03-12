// Runtime environment configuration
// Reads from window.__ENV__ (Docker runtime) with fallback to import.meta.env (build time)

declare global {
  interface Window {
    __ENV__?: {
      VITE_SUPABASE_URL?: string
      VITE_SUPABASE_ANON_KEY?: string
      VITE_UMAMI_WEBSITE_ID?: string
    }
    umami?: {
      track: (event: string, data?: Record<string, string | number | boolean>) => void
    }
  }
}

function getEnv(key: string): string {
  // First try runtime config (Docker)
  const runtimeValue = window.__ENV__?.[key as keyof typeof window.__ENV__]
  if (runtimeValue) {
    return runtimeValue
  }

  // Fallback to build-time config (Vite)
  return import.meta.env[key] || ''
}

export const env = {
  SUPABASE_URL: getEnv('VITE_SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnv('VITE_SUPABASE_ANON_KEY'),
  UMAMI_WEBSITE_ID: getEnv('VITE_UMAMI_WEBSITE_ID'),
}
