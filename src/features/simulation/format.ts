import { formatDurationClock } from '@/lib/time'

/** Zeitdifferenz mit Vorzeichen: 12 → „+0:12", −5 → „−0:05", 0 → „±0:00". */
export function formatDelta(seconds: number): string {
  const sign = seconds > 0 ? '+' : seconds < 0 ? '−' : '±'
  return `${sign}${formatDurationClock(Math.abs(seconds))}`
}

/** Farbe einer Differenz: schneller grün, langsamer rot. */
export const deltaTone = (seconds: number | undefined) =>
  seconds === undefined || seconds === 0
    ? 'text-fg-muted'
    : seconds > 0
      ? 'text-danger'
      : 'text-accent'
