import { addDays, weekStartOf } from '@/lib/date'
import { isValidVariant, type RaceVariant } from './variant'

/** Wettkampf (docs/RACE_PREP.md §1, Tabelle `races`). */

export const RACE_STATUSES = ['active', 'completed', 'cancelled'] as const
export type RaceStatus = (typeof RACE_STATUSES)[number]

export const RACE_NAME_MAX = 120
export const RACE_DAYS_MIN = 3
export const RACE_DAYS_MAX = 5
/** Mindestabstand beim Anlegen – kürzer lohnt kein Phasenplan */
export const RACE_MIN_LEAD_DAYS = 7
export const RACE_MAX_LEAD_DAYS = 365
export const TARGET_TIME_MIN_SEC = 20 * 60
export const TARGET_TIME_MAX_SEC = 5 * 3600

export interface RaceInput extends RaceVariant {
  name: string
  raceDate: string
  daysPerWeek: number
  /** ISO-Wochentage 1 = Mo … 7 = So; leer = alle Tage möglich */
  weekdays: number[]
  targetTimeSec: number | null
}

export interface Race extends RaceInput {
  id: string
  planStart: string
  status: RaceStatus
  resultTimeSec: number | null
  /** Optionale Zwischenzeiten in Rennreihenfolge (Lauf 1, Station 1, …) */
  resultSplits: number[] | null
  resultSessionId: string | null
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Vorschlag für einen neuen Wettkampf aus den Profildaten. */
export function defaultRaceInput(
  today: string,
  profile: { trainingDaysPerWeek?: number | null; preferredWeekdays?: readonly number[] },
): RaceInput {
  const days = profile.trainingDaysPerWeek ?? 4
  return {
    name: '',
    raceDate: addDays(today, 8 * 7),
    format: 'single',
    category: 'open',
    gender: 'men',
    daysPerWeek: Math.min(RACE_DAYS_MAX, Math.max(RACE_DAYS_MIN, days)),
    weekdays: [...(profile.preferredWeekdays ?? [])].sort((a, b) => a - b),
    targetTimeSec: null,
  }
}

/**
 * Prüft die Eingaben; liefert deutsche Fehlermeldungen (leer = gültig).
 * Beim Bearbeiten darf das Datum näher als 7 Tage liegen, aber nicht in der Vergangenheit.
 */
export function validateRaceInput(
  input: RaceInput,
  today: string,
  options: { editing: boolean } = { editing: false },
): string[] {
  const errors: string[] = []
  const name = input.name.trim()
  if (name.length === 0) errors.push('Gib dem Wettkampf einen Namen, z. B. „HYROX Wien“.')
  if (name.length > RACE_NAME_MAX)
    errors.push(`Der Name darf höchstens ${RACE_NAME_MAX} Zeichen haben.`)

  if (!DATE_PATTERN.test(input.raceDate)) {
    errors.push('Wähle das Datum des Wettkampfs.')
  } else if (
    options.editing ? input.raceDate < today : input.raceDate < addDays(today, RACE_MIN_LEAD_DAYS)
  ) {
    errors.push(
      options.editing
        ? 'Das Datum darf nicht in der Vergangenheit liegen.'
        : `Der Wettkampf muss mindestens ${RACE_MIN_LEAD_DAYS} Tage in der Zukunft liegen.`,
    )
  } else if (input.raceDate > addDays(today, RACE_MAX_LEAD_DAYS)) {
    errors.push('Der Wettkampf darf höchstens ein Jahr in der Zukunft liegen.')
  }

  if (!isValidVariant(input))
    errors.push('Diese Kombination aus Format, Kategorie und Wertung gibt es nicht.')

  if (
    !Number.isInteger(input.daysPerWeek) ||
    input.daysPerWeek < RACE_DAYS_MIN ||
    input.daysPerWeek > RACE_DAYS_MAX
  ) {
    errors.push(`Plane ${RACE_DAYS_MIN}–${RACE_DAYS_MAX} Trainingstage pro Woche.`)
  }
  if (input.weekdays.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) {
    errors.push('Ungültiger Wochentag.')
  } else if (input.weekdays.length > 0 && new Set(input.weekdays).size < input.daysPerWeek) {
    errors.push('Wähle mindestens so viele mögliche Wochentage wie Trainingstage pro Woche.')
  }

  if (
    input.targetTimeSec !== null &&
    (input.targetTimeSec < TARGET_TIME_MIN_SEC || input.targetTimeSec > TARGET_TIME_MAX_SEC)
  ) {
    errors.push('Die Zielzeit muss zwischen 20 Minuten und 5 Stunden liegen.')
  }
  return errors
}

/** Letzter Tag der Erholungswoche nach dem Wettkampf (Sonntag der Folgewoche). */
export function recoveryEnd(raceDate: string): string {
  return addDays(weekStartOf(raceDate), 13)
}

/**
 * Gilt der Wettkampf heute noch? Aktiv immer; abgeschlossen bis zum Ende der
 * Erholungswoche (so plant der Kalender die Erholung, danach wieder normal).
 */
export function isCurrentRace(race: Pick<Race, 'status' | 'raceDate'>, today: string): boolean {
  if (race.status === 'active') return true
  return race.status === 'completed' && today <= recoveryEnd(race.raceDate)
}

/** Ab dem Wettkampftag kann das Ergebnis eingetragen werden. */
export function canEnterResult(race: Pick<Race, 'status' | 'raceDate'>, today: string): boolean {
  return race.status === 'active' && today >= race.raceDate
}

export const RESULT_MIN_SEC = 10 * 60
export const RESULT_MAX_SEC = 10 * 3600
/** 8 Läufe + 8 Stationen */
export const RESULT_SPLIT_COUNT = 16
/** Erlaubte Abweichung zwischen Gesamtzeit und Summe der Zwischenzeiten */
const SPLIT_TOLERANCE_SEC = 60

/** Prüft das Ergebnis; `splits` leer = ohne Zwischenzeiten. Liefert Fehlermeldungen. */
export function validateResult(
  timeSec: number | null,
  splits: readonly (number | null)[],
): string[] {
  const errors: string[] = []
  if (timeSec === null) {
    errors.push('Trag deine Gesamtzeit ein, z. B. 1:28:45.')
  } else if (timeSec < RESULT_MIN_SEC || timeSec > RESULT_MAX_SEC) {
    errors.push('Die Gesamtzeit muss zwischen 10 Minuten und 10 Stunden liegen.')
  }
  const filled = splits.filter((s) => s !== null)
  if (filled.length > 0) {
    if (filled.length < RESULT_SPLIT_COUNT || splits.length !== RESULT_SPLIT_COUNT) {
      errors.push('Trag alle 16 Zwischenzeiten ein oder lass sie ganz leer.')
    } else if (timeSec !== null) {
      const sum = filled.reduce((a, b) => a + b, 0)
      if (Math.abs(sum - timeSec) > SPLIT_TOLERANCE_SEC) {
        errors.push('Die Zwischenzeiten ergeben zusammen nicht die Gesamtzeit (± 1 min).')
      }
    }
  }
  return errors
}
