/**
 * Zeitangaben für Eingabefelder: „4:05" (m:ss) oder „1:12:30" (h:mm:ss) ⇄ Sekunden.
 */

/** Liefert Sekunden oder `null`, wenn die Eingabe kein gültiges Zeitformat ist. */
export function parseDuration(input: string): number | null {
  const text = input.trim()
  if (!/^\d{1,3}(:\d{1,2}){0,2}$/.test(text)) return null

  const parts = text.split(':').map(Number)
  // Bei mehreren Teilen müssen Minuten/Sekunden (alle außer dem ersten) unter 60 liegen
  if (parts.slice(1).some((part) => part >= 60)) return null

  const seconds = parts.reduce((total, part) => total * 60 + part, 0)
  return seconds > 0 ? seconds : null
}

/** 245 → „4:05", 4350 → „1:12:30". */
export function formatDurationClock(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds)
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}
