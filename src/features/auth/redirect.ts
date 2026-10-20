/**
 * Ermittelt, wohin nach dem Login weitergeleitet wird: zur ursprünglich aufgerufenen Seite,
 * sofern es ein interner Pfad ist – sonst zur Startseite.
 */
export function getRedirectTarget(locationState: unknown): string {
  if (typeof locationState !== 'object' || locationState === null || !('from' in locationState)) {
    return '/'
  }
  const from = locationState.from
  // Nur interne Pfade ("/…"), keine externen Adressen ("//…") und nicht zurück zum Login
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return '/'
  if (from === '/login') return '/'
  return from
}
