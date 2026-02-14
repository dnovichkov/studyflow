import i18n from '@/i18n'

export function getSafeErrorMessage(err: unknown, fallbackKey: string): string {
  if (!err) return i18n.t(fallbackKey)

  if (err instanceof Error) {
    const msg = err.message.toLowerCase()

    if (msg.includes('invalid login credentials')) {
      return i18n.t('errors.invalidCredentials')
    }
    if (msg.includes('email not confirmed')) {
      return i18n.t('errors.emailNotConfirmed')
    }
    if (msg.includes('user already registered')) {
      return i18n.t('errors.userAlreadyRegistered')
    }
    if (msg.includes('rate limit')) {
      return i18n.t('errors.rateLimited')
    }
  }

  console.error('Operation failed:', err)
  return i18n.t(fallbackKey)
}
