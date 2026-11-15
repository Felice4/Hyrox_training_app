import { PHASE_LABELS, raceTimeline, raceWeekOf } from '@/domain/race/phases'
import type { Race } from '@/domain/race/race'

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
