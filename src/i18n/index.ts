import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { ru } from './locales/ru'
import { en } from './locales/en'

export type Language = 'ru' | 'en'

export const SUPPORTED_LANGUAGES: { code: Language; label: string }[] = [
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
]

function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'ru'
  const stored = localStorage.getItem('language') as Language | null
  if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) return stored
  return 'ru'
}

const initialLanguage = getStoredLanguage()

// Set lang attribute immediately to avoid flash
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLanguage
}

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: initialLanguage,
  fallbackLng: 'ru',
  interpolation: {
    // React handles XSS escaping in JSX. Enabling escapeValue would cause
    // double-escaping (e.g., & -> &amp;amp;). PrintDialog uses its own escapeHtml().
    escapeValue: false,
  },
})

export default i18n
