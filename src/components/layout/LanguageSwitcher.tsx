import { Button } from '@/components/ui/button'
import { useLanguage } from '@/hooks/useLanguage'
import { SUPPORTED_LANGUAGES } from '@/i18n'

export function LanguageSwitcher() {
  const { language, toggleLanguage } = useLanguage()

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === language)

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      title={language === 'ru' ? 'Switch to English' : 'Переключить на русский'}
      className="text-xs font-semibold"
    >
      {current?.label ?? 'RU'}
    </Button>
  )
}
