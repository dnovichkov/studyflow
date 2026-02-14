const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}){1,2}$/

export function sanitizeHexColor(color: string | null | undefined, fallback: string): string {
  if (!color) return fallback
  return HEX_COLOR_RE.test(color) ? color : fallback
}

export function sanitizeHexColorBare(color: string | null | undefined, fallback: string): string {
  const withHash = color ? (color.startsWith('#') ? color : `#${color}`) : null
  const validated = sanitizeHexColor(withHash, `#${fallback}`)
  return validated.replace('#', '')
}
