import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem('theme') as Theme) || 'system'
  })

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (t: Theme) => {
      if (t === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.toggle('dark', systemDark)
      } else {
        root.classList.toggle('dark', t === 'dark')
      }
    }

    applyTheme(theme)
    localStorage.setItem('theme', theme)

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle('dark', e.matches)
      }
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'light') return 'dark'
      if (prev === 'dark') return 'system'
      return 'light'
    })
  }

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  return { theme, setTheme, toggleTheme, isDark }
}
