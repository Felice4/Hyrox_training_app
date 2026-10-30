import { z } from 'zod'
import {
  CATEGORIES,
  EQUIPMENT,
  HYROX_STATIONS,
  MEASUREMENTS,
  MOVEMENT_PATTERNS,
  MUSCLE_GROUPS,
  STRESS_REGIONS,
  TRAINING_TYPES,
  type Measurement,
} from './vocabulary'

/** Bereich [Minimum, Maximum], z. B. Wiederholungen [8, 12]. */
const rangeSchema = z
  .tuple([z.number().nonnegative(), z.number().nonnegative()])
  .refine(([min, max]) => min <= max, { error: 'Bereich: Minimum ist größer als Maximum' })

/**
 * Geeignete Belastungsparameter einer Übung. Welche Angaben Pflicht sind, hängt von der
 * Messart ab (siehe REQUIRED_LOAD_FIELDS). Der Generator wählt daraus je nach Ziel und
 * Intensität konkrete Werte.
 */
export const loadParamsSchema = z.strictObject({
  sets: rangeSchema,
  reps: rangeSchema.optional(),
  distanceM: rangeSchema.optional(),
  durationSec: rangeSchema.optional(),
  calories: rangeSchema.optional(),
  restSec: rangeSchema,
})

type LoadField = 'reps' | 'distanceM' | 'durationSec' | 'calories'

const REQUIRED_LOAD_FIELDS: Record<Measurement, LoadField> = {
  weight_reps: 'reps',
  reps: 'reps',
  weight_distance: 'distanceM',
  weight_time: 'durationSec',
  distance: 'distanceM',
  distance_time: 'distanceM',
  time: 'durationSec',
  calories: 'calories',
}

/** Stabile ID im Kebab-Case, z. B. „hyrox-sled-push". Nie ändern, sobald synchronisiert! */
const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
  error: 'Slug nur aus Kleinbuchstaben, Ziffern und Bindestrichen',
})

function hasDuplicates(values: readonly unknown[]): boolean {
  return new Set(values).size !== values.length
}

const exerciseObject = z.strictObject({
  slug: slugSchema,
  name: z.string().min(2).max(80),
  description: z.string().min(10).max(400),
  category: z.enum(CATEGORIES),
  trainingTypes: z.array(z.enum(TRAINING_TYPES)).min(1),
  movementPattern: z.enum(MOVEMENT_PATTERNS),
  primaryMuscles: z.array(z.enum(MUSCLE_GROUPS)).min(1),
  secondaryMuscles: z.array(z.enum(MUSCLE_GROUPS)).default([]),
  /** Benötigte Geräte – ALLE müssen verfügbar sein. Leer = Körpergewicht. */
  equipment: z.array(z.enum(EQUIPMENT)).default([]),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  measurement: z.enum(MEASUREMENTS),
  loadParams: loadParamsSchema,
  instructions: z.array(z.string().min(5)).min(2),
  /** Slugs geeigneter Alternativübungen (manuell gepflegt). */
  alternatives: z.array(slugSchema).default([]),
  /** Nur für echte Stations-Übungen bzw. direkte Varianten davon. */
  hyroxStation: z.enum(HYROX_STATIONS).optional(),
  stressRegions: z.array(z.enum(STRESS_REGIONS)).default([]),
})

type ExerciseShape = z.output<typeof exerciseObject>

/** Prüfungen über mehrere Felder – gelten für Bibliotheks- und eigene Übungen. */
function checkExercise(exercise: ExerciseShape, ctx: z.RefinementCtx) {
  const required = REQUIRED_LOAD_FIELDS[exercise.measurement]
  if (!exercise.loadParams[required]) {
    ctx.addIssue({
      code: 'custom',
      path: ['loadParams', required],
      message: `Messart „${exercise.measurement}" erfordert loadParams.${required}`,
    })
  }

  const overlap = exercise.primaryMuscles.filter((m) => exercise.secondaryMuscles.includes(m))
  if (overlap.length > 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['secondaryMuscles'],
      message: `Muskeln sowohl primär als auch sekundär: ${overlap.join(', ')}`,
    })
  }

  const arrays = {
    trainingTypes: exercise.trainingTypes,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    equipment: exercise.equipment,
    alternatives: exercise.alternatives,
    stressRegions: exercise.stressRegions,
  }
  for (const [field, values] of Object.entries(arrays)) {
    if (hasDuplicates(values)) {
      ctx.addIssue({ code: 'custom', path: [field], message: 'Doppelte Einträge' })
    }
  }

  if (exercise.alternatives.includes(exercise.slug)) {
    ctx.addIssue({
      code: 'custom',
      path: ['alternatives'],
      message: 'Übung verweist auf sich selbst',
    })
  }

  if (exercise.hyroxStation && exercise.category !== 'hyrox') {
    ctx.addIssue({
      code: 'custom',
      path: ['hyroxStation'],
      message: 'hyroxStation nur bei Kategorie „hyrox"',
    })
  }
}

/** Bibliotheksübung (src/data/exercises) – vollständig mit Beschreibung und Ausführung. */
export const exerciseDefinitionSchema = exerciseObject.superRefine(checkExercise)

/**
 * Eigene Übung: Beschreibung und Ausführungshinweise sind freiwillig, sonst gelten
 * dieselben Regeln wie für die Bibliothek.
 */
export const customExerciseSchema = exerciseObject
  .extend({
    description: z.string().max(400),
    instructions: z.array(z.string().min(1).max(300)).max(12),
  })
  .superRefine(checkExercise)

/** Eingabeform im Code (Standardwerte dürfen weggelassen werden). */
export type ExerciseInput = z.input<typeof exerciseDefinitionSchema>
/** Vollständige, geprüfte Übung. */
export type ExerciseDefinition = z.output<typeof exerciseDefinitionSchema>
export type LoadParams = z.output<typeof loadParamsSchema>
