import { DURATION } from '@/domain/generator/config'
import type {
  BlockType,
  GeneratorExercise,
  PlannedSet,
  WorkoutBlock,
} from '@/domain/generator/types'
import type { TrainingLevel } from '@/domain/profile/vocabulary'

type PaceExercise = Pick<
  GeneratorExercise,
  'equipment' | 'movementPattern' | 'hyroxStation' | 'category' | 'measurement'
>

/** Wie viele Sekunden braucht man für einen Meter dieser Übung? (konservative Annahmen) */
export function secondsPerMeter(exercise: PaceExercise, level: TrainingLevel): number {
  const spm = DURATION.secondsPerMeter
  if (exercise.equipment.includes('rower')) return spm.rower
  if (exercise.equipment.includes('skierg')) return spm.skierg
  if (exercise.equipment.includes('sled')) return spm.sled
  if (exercise.hyroxStation === 'burpee_broad_jump') return spm.burpeeBroadJump
  if (exercise.movementPattern === 'lunge') return spm.lunge
  if (exercise.movementPattern === 'carry') return spm.carry
  if (exercise.movementPattern === 'locomotion') {
    // Laufen bzw. Laufband – Fortbewegung im Vierfüßlerstand ist deutlich langsamer
    if (exercise.measurement === 'distance' && exercise.category !== 'endurance') {
      return exercise.equipment.length === 0 ? spm.crawl : spm.default
    }
    return DURATION.runPaceSecPerKm[level] / 1000
  }
  return spm.default
}

/** Reine Arbeitszeit eines Satzes (ohne Pause). */
export function setWorkSeconds(
  set: PlannedSet,
  exercise: PaceExercise,
  level: TrainingLevel,
): number {
  if (set.durationSec !== undefined) return set.durationSec
  if (set.distanceM !== undefined) return set.distanceM * secondsPerMeter(exercise, level)
  if (set.calories !== undefined) return set.calories * DURATION.secondsPerCalorie
  if (set.reps !== undefined) return set.reps * DURATION.secondsPerRep
  return 0
}

/**
 * Dauer einer Übung: Σ (Satz + Pause) − letzte Pause + Wechsel/Aufbau
 * (docs/GENERATOR.md, Schritt 8).
 */
export function estimateItemSeconds(
  sets: readonly PlannedSet[],
  exercise: PaceExercise,
  level: TrainingLevel,
  block: BlockType,
): number {
  if (sets.length === 0) return 0
  const work = sets.reduce((sum, set) => sum + setWorkSeconds(set, exercise, level), 0)
  const rests = sets.slice(0, -1).reduce((sum, set) => sum + set.restSec, 0)
  return Math.round(work + rests + DURATION.transitionSec[block])
}

/** Gesamtdauer in Minuten (gerundet). */
export function totalMinutes(blocks: readonly Pick<WorkoutBlock, 'items'>[]): number {
  const seconds = blocks.reduce(
    (sum, block) => sum + block.items.reduce((s, item) => s + item.estimatedSec, 0),
    0,
  )
  return Math.round(seconds / 60)
}
