import type { CatalogExercise } from '@/api/exercises'
import { customExerciseSchema, type ExerciseDefinition } from '@/data/exercises/schema'
import type {
  CombatSport,
  Difficulty,
  GiMode,
  Measurement,
  MuscleGroup,
} from '@/data/exercises/vocabulary'
import { SPORT_DEFAULT_MUSCLES } from '@/domain/combat/drills'
import { formatDurationClock, parseDuration } from '@/lib/time'

/** Erfassung eines eigenen Drills: Wiederholungen oder Zeit, jeweils mit oder ohne Gewicht. */
export const DRILL_MEASUREMENTS = ['reps', 'time', 'weight_reps', 'weight_time'] as const
export type DrillMeasurement = (typeof DRILL_MEASUREMENTS)[number]
export const DRILL_MEASUREMENT_LABELS: Record<DrillMeasurement, string> = {
  reps: 'Wiederholungen',
  time: 'Zeit / Runden',
  weight_reps: 'Gewicht × Wiederholungen',
  weight_time: 'Gewicht × Zeit',
}

export const isWeighted = (m: DrillMeasurement) => m === 'weight_reps' || m === 'weight_time'
export const isTimed = (m: DrillMeasurement) => m === 'time' || m === 'weight_time'

/** Formularzustand (Zahlen als Text, damit Eingaben frei bearbeitbar bleiben). */
export interface CombatDrillDraft {
  name: string
  sports: CombatSport[]
  giMode: GiMode
  level: Difficulty
  description: string
  /** Ablauf: ein Schritt pro Zeile */
  instructions: string
  measurement: DrillMeasurement
  sets: string
  reps: string
  /** Dauer je Satz bzw. Runde, „2:00" oder „90" */
  duration: string
  weightKg: string
  restSec: string
  /** Hauptmuskeln eines kopierten bzw. bearbeiteten Drills (sonst aus der Sportart) */
  muscles?: MuscleGroup[] | undefined
}

export function emptyDrillDraft(sport: CombatSport): CombatDrillDraft {
  return {
    name: '',
    sports: [sport],
    giMode: 'both',
    level: 1,
    description: '',
    instructions: '',
    measurement: 'time',
    sets: '3',
    reps: '10',
    duration: '2:00',
    weightKg: '',
    restSec: '60',
  }
}

const isDrillMeasurement = (m: Measurement): m is DrillMeasurement =>
  (DRILL_MEASUREMENTS as readonly string[]).includes(m)

const decimal = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2, useGrouping: false })

/**
 * Formular aus einem vorhandenen Drill – zum Bearbeiten eines eigenen Drills oder als
 * Kopie (`copy`: Name mit Zusatz „(eigener)"). Aus Bereichen wird der untere Wert übernommen.
 */
export function draftFromDrill(exercise: CatalogExercise, copy: boolean): CombatDrillDraft {
  const load = exercise.loadParams
  return {
    name: copy ? `${exercise.name} (eigener)`.slice(0, 80) : exercise.name,
    sports: [...exercise.combatSports],
    giMode: exercise.giMode ?? 'both',
    level: exercise.difficulty,
    description: exercise.description,
    instructions: exercise.instructions.join('\n'),
    measurement: isDrillMeasurement(exercise.measurement) ? exercise.measurement : 'time',
    sets: String(load.sets[0]),
    reps: String(load.reps?.[0] ?? 10),
    duration: formatDurationClock(load.durationSec?.[0] ?? 120),
    weightKg: load.weightKg ? decimal.format(load.weightKg[0]) : '',
    restSec: String(load.restSec[0]),
    muscles: [...exercise.primaryMuscles],
  }
}

export type DrillDraftErrors = Partial<
  Record<'name' | 'sports' | 'sets' | 'reps' | 'duration' | 'weightKg' | 'restSec' | 'form', string>
>

function parseInteger(text: string, min: number, max: number): number | string {
  const value = text.trim()
  if (!/^\d+$/.test(value)) return 'Bitte eine ganze Zahl eingeben.'
  const n = Number(value)
  return n < min || n > max ? `Erlaubt: ${min}–${max}` : n
}

function parseKg(text: string): number | string {
  const value = text.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return 'Bitte ein Gewicht in kg eingeben, z. B. 12,5.'
  const n = Number(value)
  return n <= 0 || n > 300 ? 'Erlaubt: bis 300 kg' : n
}

function parseRoundDuration(text: string): number | string {
  const sec = parseDuration(text)
  if (sec === null) return 'Bitte eine Dauer wie 2:00 oder 90 eingeben.'
  return sec > 3600 ? 'Höchstens 60 Minuten je Runde' : sec
}

/** Prüft das Formular und liefert den fertigen Drill (eigene Übung der Kategorie „combat"). */
export function drillDraftToExercise(
  draft: CombatDrillDraft,
  slug: string,
): { ok: true; exercise: ExerciseDefinition } | { ok: false; errors: DrillDraftErrors } {
  const errors: DrillDraftErrors = {}
  const name = draft.name.trim()
  if (name.length < 2 || name.length > 80) errors.name = 'Name: 2 bis 80 Zeichen'
  const sport = draft.sports[0]
  if (sport === undefined) errors.sports = 'Mindestens eine Kampfsportart wählen'

  const timed = isTimed(draft.measurement)
  const sets = parseInteger(draft.sets, 1, 20)
  const main = timed ? parseRoundDuration(draft.duration) : parseInteger(draft.reps, 1, 500)
  const weight = isWeighted(draft.measurement) ? parseKg(draft.weightKg) : undefined
  const rest = parseInteger(draft.restSec, 0, 600)
  if (typeof sets === 'string') errors.sets = sets
  if (typeof main === 'string') errors[timed ? 'duration' : 'reps'] = main
  if (typeof weight === 'string') errors.weightKg = weight
  if (typeof rest === 'string') errors.restSec = rest

  if (
    sport === undefined ||
    Object.keys(errors).length > 0 ||
    typeof sets === 'string' ||
    typeof main === 'string' ||
    typeof rest === 'string' ||
    typeof weight === 'string'
  ) {
    return { ok: false, errors }
  }

  const parsed = customExerciseSchema.safeParse({
    slug,
    name,
    description: draft.description.trim(),
    category: 'combat',
    combatSports: draft.sports,
    giMode: draft.sports.includes('bjj') ? draft.giMode : undefined,
    trainingTypes: weight !== undefined ? ['skill', 'strength'] : ['skill'],
    movementPattern: 'full_body',
    primaryMuscles: draft.muscles?.length ? draft.muscles : SPORT_DEFAULT_MUSCLES[sport],
    secondaryMuscles: [],
    equipment: [],
    difficulty: draft.level,
    measurement: draft.measurement,
    loadParams: {
      sets: [sets, sets],
      ...(timed ? { durationSec: [main, main] } : { reps: [main, main] }),
      ...(weight !== undefined ? { weightKg: [weight, weight] } : {}),
      restSec: [rest, rest],
    },
    instructions: draft.instructions
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    alternatives: [],
    stressRegions: [],
  })
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return {
      ok: false,
      errors: { form: `Bitte Eingaben prüfen (${issue?.path.join('.') || 'Drill'}).` },
    }
  }
  return { ok: true, exercise: parsed.data }
}

/** Slug für einen neuen eigenen Drill – nie im Konflikt mit der Bibliothek. */
export const newDrillSlug = (uuid: string) => `custom-${uuid.toLowerCase()}`
