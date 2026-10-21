import { z } from 'zod'
import { FOCUSES, INTENSITIES, SLOT_ROLES } from './types'

/**
 * Prüfschema für ein generiertes Workout. Jeder Generator – auch ein späteres KI-Modell –
 * muss diese Struktur liefern. Wird auch beim Laden gespeicherter Workouts verwendet.
 */
const positive = z.number().positive()

export const plannedSetSchema = z.strictObject({
  type: z.enum(['warmup', 'working', 'interval', 'round']),
  reps: z.int().positive().optional(),
  weightKg: positive.optional(),
  distanceM: positive.optional(),
  durationSec: positive.optional(),
  calories: positive.optional(),
  restSec: z.number().min(0),
})

export const workoutItemSchema = z.strictObject({
  exerciseSlug: z.string().min(1),
  exerciseName: z.string().min(1),
  role: z.enum(SLOT_ROLES),
  sets: z.array(plannedSetSchema).min(1),
  note: z.string().optional(),
  estimatedSec: z.number().min(0),
})

export const workoutBlockSchema = z.strictObject({
  type: z.enum(['warmup', 'main', 'accessory', 'conditioning', 'cooldown']),
  items: z.array(workoutItemSchema).min(1),
  rounds: z.int().min(2).optional(),
})

export const generatedWorkoutSchema = z
  .strictObject({
    generatorVersion: z.string().min(1),
    seed: z.int(),
    focus: z.enum(FOCUSES),
    intensity: z.enum(INTENSITIES),
    targetDurationMin: z.int().min(10).max(240),
    estimatedDurationMin: z.int().min(0),
    blocks: z.array(workoutBlockSchema).min(1),
    explanation: z.array(z.string()),
    recoverySuggested: z.boolean(),
  })
  .superRefine((workout, ctx) => {
    workout.blocks.forEach((block, bi) => {
      if (block.rounds === undefined) return
      block.items.forEach((item, ii) => {
        if (item.sets.length !== block.rounds) {
          ctx.addIssue({
            code: 'custom',
            path: ['blocks', bi, 'items', ii, 'sets'],
            message: 'Im Zirkel muss jede Übung so viele Sätze wie Runden haben',
          })
        }
      })
    })
  })
