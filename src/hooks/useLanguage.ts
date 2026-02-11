import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '@/i18n'
import type { Language } from '@/i18n'

export function useLanguage() {
  const { i18n } = useTranslation()

  const language = i18n.language as Language

  const setLanguage = (lang: Language) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
    document.documentElement.lang = lang
  }

  const toggleLanguage = () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code)
    const currentIndex = codes.indexOf(language)
    const nextIndex = (currentIndex + 1) % codes.length
    setLanguage(codes[nextIndex])
  }

  return { language, setLanguage, toggleLanguage }
}
