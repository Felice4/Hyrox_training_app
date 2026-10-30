import type { CatalogExercise } from '@/api/exercises'
import { customExerciseSchema, type ExerciseDefinition } from '@/data/exercises/schema'
import type {
  Category,
  Equipment,
  HyroxStation,
  Measurement,
  MovementPattern,
  MuscleGroup,
  StressRegion,
  TrainingType,
} from '@/data/exercises/vocabulary'

/** Belastungsfeld, das je Messart Pflicht ist (wie im Schema). */
export type MainLoadField = 'reps' | 'distanceM' | 'durationSec' | 'calories'

export const MAIN_LOAD_FIELD: Record<Measurement, MainLoadField> = {
  weight_reps: 'reps',
  reps: 'reps',
  weight_distance: 'distanceM',
  weight_time: 'durationSec',
  distance: 'distanceM',
  distance_time: 'distanceM',
  time: 'durationSec',
  calories: 'calories',
}

export const MAIN_LOAD_LABEL: Record<MainLoadField, { label: string; unit: string }> = {
  reps: { label: 'Wiederholungen', unit: 'Wdh.' },
  distanceM: { label: 'Strecke', unit: 'm' },
  durationSec: { label: 'Dauer', unit: 's' },
  calories: { label: 'Kalorien', unit: 'kcal' },
}

const MAIN_DEFAULTS: Record<MainLoadField, [string, string]> = {
  reps: ['8', '12'],
  distanceM: ['200', '1000'],
  durationSec: ['30', '60'],
  calories: ['10', '20'],
}

type Range = [string, string]

/** Formularzustand (Zahlen als Text, damit Eingaben frei bearbeitbar bleiben). */
export interface CustomExerciseDraft {
  name: string
  description: string
  category: Category
  measurement: Measurement
  trainingTypes: TrainingType[]
  movementPattern: MovementPattern
  primaryMuscles: MuscleGroup[]
  secondaryMuscles: MuscleGroup[]
  equipment: Equipment[]
  difficulty: 1 | 2 | 3
  hyroxStation: HyroxStation | ''
  stressRegions: StressRegion[]
  sets: Range
  main: Range
  rest: Range
  /** Ein Ausführungshinweis pro Zeile */
  instructions: string
}

export function emptyDraft(): CustomExerciseDraft {
  return {
    name: '',
    description: '',
    category: 'strength',
    measurement: 'weight_reps',
    trainingTypes: ['strength'],
    movementPattern: 'full_body',
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: [],
    difficulty: 2,
    hyroxStation: '',
    stressRegions: [],
    sets: ['3', '4'],
    main: MAIN_DEFAULTS.reps,
    rest: ['60', '90'],
    instructions: '',
  }
}

/** Beim Wechsel der Messart passende Standardwerte für das Pflichtfeld setzen. */
export function withMeasurement(
  draft: CustomExerciseDraft,
  measurement: Measurement,
): CustomExerciseDraft {
  const sameField = MAIN_LOAD_FIELD[measurement] === MAIN_LOAD_FIELD[draft.measurement]
  return {
    ...draft,
    measurement,
    main: sameField ? draft.main : MAIN_DEFAULTS[MAIN_LOAD_FIELD[measurement]],
  }
}

const text = (range: readonly [number, number] | undefined, fallback: Range): Range =>
  range ? [String(range[0]), String(range[1])] : fallback

/**
 * Formular aus einer vorhandenen Übung – zum Bearbeiten einer eigenen Übung oder zum
 * Kopieren einer Bibliotheksübung (`copy`: Name mit Zusatz „(eigene)").
 */
export function draftFromExercise(exercise: CatalogExercise, copy: boolean): CustomExerciseDraft {
  const field = MAIN_LOAD_FIELD[exercise.measurement]
  const name = copy ? `${exercise.name} (eigene)`.slice(0, 80) : exercise.name
  return {
    name,
    description: exercise.description,
    category: exercise.category,
    measurement: exercise.measurement,
    trainingTypes: [...exercise.trainingTypes],
    movementPattern: exercise.movementPattern,
    primaryMuscles: [...exercise.primaryMuscles],
    secondaryMuscles: [...exercise.secondaryMuscles],
    equipment: [...exercise.equipment],
    difficulty: exercise.difficulty,
    hyroxStation: exercise.hyroxStation ?? '',
    stressRegions: [...exercise.stressRegions],
    sets: text(exercise.loadParams.sets, ['3', '4']),
    main: text(exercise.loadParams[field], MAIN_DEFAULTS[field]),
    rest: text(exercise.loadParams.restSec, ['60', '90']),
    instructions: exercise.instructions.join('\n'),
  }
}

export type DraftErrors = Partial<
  Record<'name' | 'trainingTypes' | 'primaryMuscles' | 'sets' | 'main' | 'rest' | 'form', string>
>

function parseRange(range: Range, min: number, max: number): [number, number] | string {
  const [a, b] = range.map((v) => v.trim())
  if (!a || !b || !/^\d+$/.test(a) || !/^\d+$/.test(b)) return 'Bitte zwei ganze Zahlen eingeben.'
  const from = Number(a)
  const to = Number(b)
  if (from > to) return 'Der erste Wert darf nicht größer als der zweite sein.'
  if (from < min || to > max) return `Erlaubt: ${min}–${max}`
  return [from, to]
}

const MAIN_LIMITS: Record<MainLoadField, [number, number]> = {
  reps: [1, 200],
  distanceM: [1, 50_000],
  durationSec: [1, 7_200],
  calories: [1, 500],
}

/** Prüft das Formular und liefert die fertige Übung oder deutsche Fehlermeldungen je Feld. */
export function draftToExercise(
  draft: CustomExerciseDraft,
  slug: string,
): { ok: true; exercise: ExerciseDefinition } | { ok: false; errors: DraftErrors } {
  const errors: DraftErrors = {}
  const name = draft.name.trim()
  if (name.length < 2 || name.length > 80) errors.name = 'Name: 2 bis 80 Zeichen'
  if (draft.trainingTypes.length === 0) errors.trainingTypes = 'Mindestens ein Trainingsziel wählen'
  if (draft.primaryMuscles.length === 0)
    errors.primaryMuscles = 'Mindestens einen Hauptmuskel wählen'

  const field = MAIN_LOAD_FIELD[draft.measurement]
  const sets = parseRange(draft.sets, 1, 20)
  const main = parseRange(draft.main, ...MAIN_LIMITS[field])
  const rest = parseRange(draft.rest, 0, 600)
  if (typeof sets === 'string') errors.sets = sets
  if (typeof main === 'string') errors.main = main
  if (typeof rest === 'string') errors.rest = rest
  if (
    Object.keys(errors).length > 0 ||
    typeof sets === 'string' ||
    typeof main === 'string' ||
    typeof rest === 'string'
  ) {
    return { ok: false, errors }
  }

  const parsed = customExerciseSchema.safeParse({
    slug,
    name,
    description: draft.description.trim(),
    category: draft.category,
    trainingTypes: draft.trainingTypes,
    movementPattern: draft.movementPattern,
    primaryMuscles: draft.primaryMuscles,
    // Ein Muskel ist entweder Haupt- oder Hilfsmuskel
    secondaryMuscles: draft.secondaryMuscles.filter((m) => !draft.primaryMuscles.includes(m)),
    equipment: draft.equipment,
    difficulty: draft.difficulty,
    measurement: draft.measurement,
    loadParams: { sets, [field]: main, restSec: rest },
    instructions: draft.instructions
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    alternatives: [],
    // Station nur bei Kategorie HYROX
    hyroxStation:
      draft.category === 'hyrox' && draft.hyroxStation !== '' ? draft.hyroxStation : undefined,
    stressRegions: draft.stressRegions,
  })
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return {
      ok: false,
      errors: { form: `Bitte Eingaben prüfen (${issue?.path.join('.') || 'Übung'}).` },
    }
  }
  return { ok: true, exercise: parsed.data }
}

/** Slug für eine neue eigene Übung – nie im Konflikt mit der Bibliothek. */
export const newCustomSlug = (uuid: string) => `custom-${uuid.toLowerCase()}`
