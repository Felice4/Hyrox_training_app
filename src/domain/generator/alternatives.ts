import type { Equipment } from '@/data/exercises/vocabulary'
import { HYROX_STATION_LABELS, MOVEMENT_PATTERN_LABELS } from '@/data/exercises/vocabulary'
import type { TrainingLevel } from '@/domain/profile/vocabulary'
import { doseExercise } from './dosing'
import { estimateWorkoutItem } from './generateWorkout'
import { filterPool } from './pool'
import type {
  GeneratedWorkout,
  GeneratorExercise,
  GeneratorProfile,
  HistorySession,
  PlannedSet,
} from './types'

export interface AlternativeInput {
  exerciseSlug: string
  exercises: readonly GeneratorExercise[]
  profile: GeneratorProfile
  unavailableEquipment?: readonly Equipment[] | undefined
  /** Übungen, die schon im Workout sind */
  excludeSlugs?: readonly string[] | undefined
  limit?: number | undefined
}

export interface ExerciseSuggestion {
  exercise: GeneratorExercise
  /** Kurzer Grund für die Anzeige */
  reason: string
  similarity: number
}

const overlap = <T>(a: readonly T[], b: readonly T[]) => a.filter((x) => b.includes(x)).length

/**
 * Austauschübungen mit vergleichbarem Trainingseffekt (docs/GENERATOR.md, §4):
 * 1. gepflegte Alternativen, 2. gleiches Bewegungsmuster + gleiche Hauptmuskeln,
 * 3. gleiche HYROX-Station bzw. gleiche Kategorie und Trainingsart.
 * Es gelten dieselben Filter wie im Generator (Geräte, Einschränkungen, ausgeblendet).
 */
export function suggestAlternatives(input: AlternativeInput): ExerciseSuggestion[] {
  const original = input.exercises.find((e) => e.slug === input.exerciseSlug)
  if (!original) return []
  const exclude = new Set([original.slug, ...(input.excludeSlugs ?? [])])
  const pool = filterPool(input.exercises, input.profile, input.unavailableEquipment ?? [])

  const suggestions = pool.flatMap((candidate): ExerciseSuggestion[] => {
    if (exclude.has(candidate.slug)) return []
    const curatedIndex = original.alternatives.indexOf(candidate.slug)
    const primaryOverlap = overlap(original.primaryMuscles, candidate.primaryMuscles)
    const samePattern = candidate.movementPattern === original.movementPattern
    const sameStation =
      original.hyroxStation !== undefined && candidate.hyroxStation === original.hyroxStation
    const sameEffect =
      candidate.category === original.category &&
      overlap(original.trainingTypes, candidate.trainingTypes) > 0 &&
      primaryOverlap > 0

    let base: number
    let reason: string
    if (curatedIndex >= 0) {
      base = 100 - curatedIndex
      reason = 'Empfohlene Alternative'
    } else if (samePattern && primaryOverlap > 0) {
      base = 50
      reason = `Gleiches Bewegungsmuster (${MOVEMENT_PATTERN_LABELS[original.movementPattern]}), ähnliche Muskeln`
    } else if (sameStation && original.hyroxStation) {
      base = 40
      reason = `Gleiche Station (${HYROX_STATION_LABELS[original.hyroxStation]})`
    } else if (sameEffect) {
      base = 20
      reason = 'Ähnlicher Trainingseffekt'
    } else {
      return []
    }

    const similarity =
      base +
      primaryOverlap * 5 +
      overlap(original.secondaryMuscles, candidate.secondaryMuscles) +
      (candidate.measurement === original.measurement ? 5 : 0) +
      (candidate.preference === 'preferred' ? 3 : candidate.preference === 'disliked' ? -5 : 0)
    return [{ exercise: candidate, reason, similarity }]
  })

  return suggestions
    .sort(
      (a, b) => b.similarity - a.similarity || a.exercise.name.localeCompare(b.exercise.name, 'de'),
    )
    .slice(0, input.limit ?? 5)
}

export interface SwapContext {
  level: TrainingLevel
  history: readonly HistorySession[]
}

/**
 * Tauscht eine Übung im fertigen Workout aus. Die Rolle bleibt (z. B. „Hauptübung Kraft"),
 * Sätze werden für die neue Übung neu dosiert; im Zirkel bleiben Runden und Pausen erhalten.
 * Gewichte werden nicht übertragen – nur aus der eigenen Leistung mit der neuen Übung.
 */
export function swapExercise(
  workout: GeneratedWorkout,
  blockIndex: number,
  itemIndex: number,
  replacement: GeneratorExercise,
  context: SwapContext,
): GeneratedWorkout {
  const block = workout.blocks[blockIndex]
  const item = block?.items[itemIndex]
  if (!block || !item) return workout

  const inCircuit = block.rounds !== undefined
  const dosed = doseExercise(replacement, item.role, {
    intensity: workout.intensity,
    volumeFactor: 1,
    loadFactor: 1,
    history: context.history,
    fixedSets: inCircuit ? block.rounds : undefined,
  })
  // Im Zirkel bleiben die Pausen an ihrer Position (nur nach der letzten Übung einer Runde)
  const sets: PlannedSet[] = inCircuit
    ? dosed.sets.map((set, i) => ({ ...set, restSec: item.sets[i]?.restSec ?? set.restSec }))
    : dosed.sets

  const newItem = {
    exerciseSlug: replacement.slug,
    exerciseName: replacement.name,
    role: item.role,
    sets,
    note: dosed.note,
    estimatedSec: estimateWorkoutItem(sets, replacement, context.level, block.type, inCircuit),
  }
  const blocks = workout.blocks.map((b, bi) =>
    bi === blockIndex
      ? { ...b, items: b.items.map((it, ii) => (ii === itemIndex ? newItem : it)) }
      : b,
  )
  const totalSec = blocks.reduce(
    (sum, b) => sum + b.items.reduce((s, it) => s + it.estimatedSec, 0),
    0,
  )
  return { ...workout, blocks, estimatedDurationMin: Math.round(totalSec / 60) }
}
