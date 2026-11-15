import { addDays } from '@/lib/date'
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
