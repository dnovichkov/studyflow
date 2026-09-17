/**
 * Автоподстановка названия учебного года для мастера «Новый учебный год».
 *
 * Пользователь всегда может переписать название вручную — задача этих функций
 * лишь в том, чтобы в 90% случаев угадать и избавить от набора текста.
 */

/**
 * Месяц (0-11), начиная с которого предлагаем СЛЕДУЮЩИЙ учебный год.
 *
 * 5 = июнь: учебный год закончился, доску на новый заводят летом.
 * Поставьте 7 (август), если июнь-июль должны считаться ещё прошлым годом —
 * тогда в июне мастер предложит «2025/2026», а не «2026/2027».
 */
const NEXT_YEAR_FROM_MONTH = 5

/**
 * Год начала учебного года, который логично предложить на указанную дату.
 *
 * Июнь 2026 → 2026 (то есть 2026/2027, старый уже закончился)
 * Январь 2027 → 2026 (то есть 2026/2027, текущий ещё идёт)
 */
export function suggestSchoolYearStart(now: Date = new Date()): number {
  const year = now.getFullYear()
  return now.getMonth() >= NEXT_YEAR_FROM_MONTH ? year : year - 1
}

/**
 * Название учебного года в принятом для локали виде.
 *
 * ru → «2026/2027», en → «2026–27» (en dash, как в британских school years)
 */
export function formatSchoolYear(startYear: number, language: string): string {
  if (language.startsWith('en')) {
    return `${startYear}–${String((startYear + 1) % 100).padStart(2, '0')}`
  }
  return `${startYear}/${startYear + 1}`
}

/** Готовое название для новой доски: «2026/2027» */
export function suggestSchoolYearTitle(language: string, now: Date = new Date()): string {
  return formatSchoolYear(suggestSchoolYearStart(now), language)
}
