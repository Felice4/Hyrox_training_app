import type { ExerciseDefinition } from '@/data/exercises/schema'
import type {
  BlockType,
  GeneratedWorkout,
  PlannedSet,
  WorkoutBlock,
  WorkoutItem,
} from '@/domain/generator/types'

/**
 * Movement-Übungen von Hand ins Warm-up oder Cool-down einbauen (docs/MOVEMENT.md §5,
 * Schritt 6.5b). Nie in Hauptteil oder Kondition; der Generator plant sie nie selbst ein.
 * Reine Funktionen ohne UI/DB.
 */

export const MOVEMENT_PLACEMENTS = ['warmup', 'cooldown'] as const satisfies readonly BlockType[]
export type MovementPlacement = (typeof MOVEMENT_PLACEMENTS)[number]

/** Geschätzte Sekunden je Wiederholung (wie in der Mobility-Einheit). */
const SEC_PER_REP = 5
/** Wechsel zur nächsten Übung. */
const TRANSITION_SEC = 15

type MovementSource = Pick<ExerciseDefinition, 'slug' | 'name' | 'category' | 'loadParams'>

/** Workout-Eintrag mit der unteren Dosierung der Übung. */
export function movementItem(exercise: MovementSource): WorkoutItem {
  const load = exercise.loadParams
  const durationSec = load.durationSec?.[0]
  const set: PlannedSet = {
    type: 'working',
    reps: durationSec === undefined ? load.reps?.[0] : undefined,
    durationSec,
    weightKg: load.weightKg?.[0],
    restSec: load.restSec[0],
  }
  const sets = Array.from({ length: Math.max(1, load.sets[0]) }, () => ({ ...set }))
  const work = durationSec ?? (set.reps ?? 0) * SEC_PER_REP
  return {
    exerciseSlug: exercise.slug,
    exerciseName: exercise.name,
    role: 'movement',
    sets,
    estimatedSec: sets.length * work + (sets.length - 1) * set.restSec + TRANSITION_SEC,
  }
}

/** Eingebaute Movement-Übungen mit ihrer Stelle (in Reihenfolge des Workouts). */
export function movementInWorkout(
  workout: GeneratedWorkout,
): { placement: MovementPlacement; item: WorkoutItem }[] {
  return workout.blocks.flatMap((block) =>
    isPlacement(block.type)
      ? block.items
          .filter((item) => item.role === 'movement')
          .map((item) => ({ placement: block.type as MovementPlacement, item }))
      : [],
  )
}

const isPlacement = (type: BlockType): type is MovementPlacement =>
  (MOVEMENT_PLACEMENTS as readonly BlockType[]).includes(type)

const sumSeconds = (blocks: readonly WorkoutBlock[]) =>
  blocks.reduce((sum, b) => sum + b.items.reduce((s, it) => s + it.estimatedSec, 0), 0)

function withBlocks(workout: GeneratedWorkout, blocks: WorkoutBlock[]): GeneratedWorkout {
  return { ...workout, blocks, estimatedDurationMin: Math.round(sumSeconds(blocks) / 60) }
}

/**
 * Baut eine Movement-Übung ins Warm-up bzw. Cool-down ein – vor den Skill-Übungen dieses
 * Blocks (die bleiben am Ende). Fehlt der Block, wird er angelegt. Unverändert, wenn die
 * Übung keine Movement-Übung ist oder schon im Workout steht.
 */
export function addMovement(
  workout: GeneratedWorkout,
  exercise: MovementSource,
  placement: MovementPlacement,
): GeneratedWorkout {
  if (exercise.category !== 'movement') return workout
  const inWorkout = workout.blocks.some((b) =>
    b.items.some((i) => i.exerciseSlug === exercise.slug),
  )
  if (inWorkout) return workout

  const item = movementItem(exercise)
  const index = workout.blocks.findIndex((b) => b.type === placement)
  if (index < 0) {
    const block: WorkoutBlock = { type: placement, items: [item] }
    const blocks = placement === 'warmup' ? [block, ...workout.blocks] : [...workout.blocks, block]
    return withBlocks(workout, blocks)
  }

  const blocks = workout.blocks.map((block, i) => {
    if (i !== index) return block
    const firstSkill = block.items.findIndex((it) => it.skillSlug !== undefined)
    const at = firstSkill < 0 ? block.items.length : firstSkill
    return { ...block, items: [...block.items.slice(0, at), item, ...block.items.slice(at)] }
  })
  return withBlocks(workout, blocks)
}

/** Entfernt eine eingebaute Movement-Übung; ein leerer Block fällt weg. */
export function removeMovement(workout: GeneratedWorkout, exerciseSlug: string): GeneratedWorkout {
  const blocks = workout.blocks
    .map((b) => ({
      ...b,
      items: b.items.filter((i) => !(i.role === 'movement' && i.exerciseSlug === exerciseSlug)),
    }))
    .filter((b) => b.items.length > 0)
  return withBlocks(workout, blocks)
}
