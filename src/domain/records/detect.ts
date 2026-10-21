import type { ActiveExercise, ActiveSession } from '@/domain/session/types'
import { contextKey, type RecordContext, type RecordType, type RecordUnit } from './presets'

/** Wiederholungszahlen, für die ein eigenes Maximalgewicht geführt wird. */
export const REP_RECORD_CONTEXTS = [1, 3, 5, 8, 10, 12] as const

/** Bis zu dieser Wiederholungszahl wird ein 1RM geschätzt (darüber zu ungenau). */
const MAX_REPS_FOR_1RM = 12

export interface RecordCandidate {
  exerciseSlug: string
  recordType: RecordType
  context: RecordContext
  contextKey: string
  value: number
  unit: RecordUnit
  achievedAt: string
}

/** Geschätztes Maximalgewicht nach Epley, auf 0,5 kg gerundet. */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  const estimate = reps === 1 ? weightKg : weightKg * (1 + reps / 30)
  return Math.round(estimate * 2) / 2
}

const LOWER_IS_BETTER: readonly RecordType[] = ['best_time', 'best_pace']

export function isBetter(type: RecordType, candidate: number, current: number): boolean {
  return LOWER_IS_BETTER.includes(type) ? candidate < current : candidate > current
}

/**
 * Beste Leistungen eines Trainings je Übung, Art und Bedingung (docs/DATABASE.md §3.11).
 * Ob es ein NEUER Rekord ist, entscheidet die Datenbank beim Speichern.
 */
export function detectRecords(session: ActiveSession): RecordCandidate[] {
  const best = new Map<string, RecordCandidate>()

  const offer = (
    exercise: ActiveExercise,
    recordType: RecordType,
    context: RecordContext,
    value: number,
    unit: RecordUnit,
    achievedAt: string,
  ) => {
    if (!(value > 0)) return
    const key = `${exercise.exerciseSlug}|${recordType}|${contextKey(context)}`
    const current = best.get(key)
    if (current && !isBetter(recordType, value, current.value)) return
    best.set(key, {
      exerciseSlug: exercise.exerciseSlug,
      recordType,
      context,
      contextKey: contextKey(context),
      value: Math.round(value * 100) / 100,
      unit,
      achievedAt,
    })
  }

  for (const exercise of session.exercises) {
    // Aufwärmen und Abwärmen sind keine Leistungsbeweise
    if (exercise.block === 'warmup' || exercise.block === 'cooldown') continue
    for (const set of exercise.sets) {
      if (!set.completed || set.type === 'warmup') continue
      const { reps, weightKg, distanceM, durationSec } = set.actual
      const at = set.completedAt ?? session.finishedAt ?? session.startedAt

      switch (exercise.measurement) {
        case 'weight_reps':
          if (weightKg && reps) {
            if (reps <= MAX_REPS_FOR_1RM) {
              offer(exercise, 'estimated_1rm', {}, estimateOneRepMax(weightKg, reps), 'kg', at)
            }
            if ((REP_RECORD_CONTEXTS as readonly number[]).includes(reps)) {
              offer(exercise, 'max_weight', { reps }, weightKg, 'kg', at)
            }
          }
          break
        case 'reps':
          if (reps) offer(exercise, 'max_reps', {}, reps, 'reps', at)
          break
        case 'weight_distance':
          if (weightKg && distanceM) {
            offer(exercise, 'max_weight', { distance_m: distanceM }, weightKg, 'kg', at)
          }
          break
        case 'distance_time':
          if (distanceM && durationSec) {
            offer(exercise, 'best_time', { distance_m: distanceM }, durationSec, 'sec', at)
          }
          break
        default:
          // Zeit, Strecke ohne Zeit, Kalorien, Gewicht × Zeit: (noch) keine Rekorde
          break
      }
    }
  }
  return [...best.values()]
}
