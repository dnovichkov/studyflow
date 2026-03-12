export function devError(message: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.error(message, ...args)
  }
}
