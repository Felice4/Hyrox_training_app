import { addDays, weekdayOf, weekStartOf } from '@/lib/date'

/**
 * Trainingsphasen bis zum Wettkampf (docs/RACE_PREP.md §2). Reine Funktionen auf
 * lokalen Daten „JJJJ-MM-TT“; gerechnet wird in Kalenderwochen (Mo–So).
 */

export const RACE_PHASES = ['base', 'build', 'deload', 'taper', 'race', 'recovery'] as const
export type RacePhase = (typeof RACE_PHASES)[number]

export const PHASE_LABELS: Record<RacePhase, string> = {
  base: 'Aufbau',
  build: 'Spezifisch',
  deload: 'Entlastung',
  taper: 'Tapering',
  race: 'Wettkampfwoche',
  recovery: 'Erholung',
}

export const PHASE_GOALS: Record<RacePhase, string> = {
  base: 'Laufumfang und Grundkraft steigern, die Stationen kennenlernen. Überwiegend locker bis mittel.',
  build:
    'Laufen unter Vorbelastung, Renntempo und Wettkampfgewichte. Mehr harte Einheiten als im Aufbau.',
  deload:
    'Erholungswoche: dieselben Einheiten, aber rund 40 % weniger Umfang und höchstens mittel.',
  taper:
    'Umfang deutlich runter, kurze Einheiten im Renntempo – du sollst frisch an den Start gehen.',
  race: '1–2 kurze Aktivierungen in den ersten Tagen, am Tag vor dem Wettkampf Ruhe.',
  recovery: 'Locker bewegen und erholen. Danach geht es mit dem normalen Training weiter.',
}

/** Länger als 16 Wochen vorher wird normal (mit HYROX-Schwerpunkt) trainiert. */
export const MAX_PLAN_WEEKS = 16
/** Jede 4. Trainingswoche ist eine Entlastungswoche (3 : 1). */
const DELOAD_EVERY = 4
/** Anteil der Aufbauwochen an den Belastungswochen (vor Spezifisch). */
const BASE_SHARE = 0.4

export interface RacePlanDates {
  /** Montag, ab dem der Plan zählt */
  planStart: string
  raceDate: string
}

export interface RaceWeek {
  /** Montag der Woche */
  weekStart: string
  phase: RacePhase
  /** Woche im Plan (1 … total); `null` für die Erholungswoche */
  number: number | null
  /** Anzahl Wochen bis einschließlich Wettkampfwoche */
  total: number
}

/**
 * Montag, ab dem der Plan beim Anlegen zählt: die laufende Woche bis Donnerstag,
 * ab Freitag die nächste Woche.
 */
export function planStartFor(today: string): string {
  const monday = weekStartOf(today)
  return weekdayOf(today) <= 4 ? monday : addDays(monday, 7)
}

/**
 * Planstart nach einer Datumsänderung: bleibt erhalten; liegt der Wettkampf nun
 * vor dem Planstart, beginnt der Plan in der Wettkampfwoche.
 */
export function adjustPlanStart(planStart: string, raceDate: string): string {
  const raceWeek = weekStartOf(raceDate)
  return raceWeek < planStart ? raceWeek : planStart
}

function weeksBetween(fromMonday: string, toMonday: string): number {
  const ms = Date.parse(`${toMonday}T12:00:00Z`) - Date.parse(`${fromMonday}T12:00:00Z`)
  return Math.round(ms / (7 * 86_400_000))
}

/** Phasen für die Belastungswochen vor dem Tapering. */
function trainingPhases(weeks: number): RacePhase[] {
  if (weeks <= 0) return []
  // Bei sehr kurzer Vorbereitung kein Aufbau und keine Entlastung
  if (weeks <= 2) return Array<RacePhase>(weeks).fill('build')
  const deload = Array.from(
    { length: weeks },
    (_, i) => (i + 1) % DELOAD_EVERY === 0 && i !== weeks - 1,
  )
  const loadWeeks = deload.filter((d) => !d).length
  const baseWeeks = Math.min(Math.ceil(loadWeeks * BASE_SHARE), Math.floor(loadWeeks / 2))
  let seen = 0
  return deload.map((isDeload) => {
    if (isDeload) return 'deload'
    seen += 1
    return seen <= baseWeeks ? 'base' : 'build'
  })
}

/**
 * Alle Wochen des Plans – ab `planStart` (höchstens 16 Wochen vor dem Wettkampf)
 * bis zur Wettkampfwoche, dazu die Erholungswoche danach.
 */
export function raceTimeline({ planStart, raceDate }: RacePlanDates): RaceWeek[] {
  const raceWeek = weekStartOf(raceDate)
  const start = weekStartOf(planStart)
  const available = Math.max(1, weeksBetween(start, raceWeek) + 1)
  const total = Math.min(available, MAX_PLAN_WEEKS)
  const first = addDays(raceWeek, -7 * (total - 1))

  const taper = total >= 12 ? 2 : total >= 3 ? 1 : 0
  const phases: RacePhase[] = [
    ...trainingPhases(total - 1 - taper),
    ...Array<RacePhase>(taper).fill('taper'),
    'race',
  ]
  return [
    ...phases.map((phase, i) => ({
      weekStart: addDays(first, 7 * i),
      phase,
      number: i + 1,
      total,
    })),
    { weekStart: addDays(raceWeek, 7), phase: 'recovery', number: null, total },
  ]
}

/** Woche des Plans, in der `date` liegt – `undefined` außerhalb des Plans. */
export function raceWeekOf(timeline: readonly RaceWeek[], date: string): RaceWeek | undefined {
  const monday = weekStartOf(date)
  return timeline.find((week) => week.weekStart === monday)
}

/** Ganze Tage von `today` bis `raceDate` (0 = heute, negativ = vorbei). */
export function daysUntil(raceDate: string, today: string): number {
  return Math.round(
    (Date.parse(`${raceDate}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000,
  )
}
