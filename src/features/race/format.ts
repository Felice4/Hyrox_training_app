import { PHASE_LABELS, raceTimeline, raceWeekOf } from '@/domain/race/phases'
import type { Race } from '@/domain/race/race'
import { formatDurationClock } from '@/lib/time'

/** „Noch 58 Tage“ bzw. „Heute“ / „Morgen“ / „Vorbei“. */
export function countdownLabel(days: number): string {
  if (days < 0) return 'Vorbei'
  if (days === 0) return 'Heute'
  if (days === 1) return 'Morgen'
  return `Noch ${days} Tage`
}

/** Phase und Woche als Text, z. B. „Spezifisch · Woche 5 von 9“. */
export function phaseLine(race: Race, date: string): string | null {
  const week = raceWeekOf(raceTimeline(race), date)
  if (!week) return null
  const label = PHASE_LABELS[week.phase]
  return week.number === null ? label : `${label} · Woche ${week.number} von ${week.total}`
}

/** „1:25–1:35 h“ bzw. „58–64 min“ */
export function formatTimeRange(lowSec: number, highSec: number): string {
  if (lowSec < 3600) return `${Math.round(lowSec / 60)}–${Math.round(highSec / 60)} min`
  const hm = (sec: number) => formatDurationClock(sec).replace(/:\d{2}$/, '')
  return `${hm(lowSec)}–${hm(highSec)} h`
}
