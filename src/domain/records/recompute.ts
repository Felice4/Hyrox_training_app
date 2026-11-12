import type { Measurement } from '@/data/exercises/vocabulary'
import type { BlockType, SetType } from '@/domain/generator/types'
import type { ActiveSession, SetValues } from '@/domain/session/types'
import { detectRecords, isBetter, type RecordCandidate } from './detect'

/**
 * Neuberechnung von Bestleistungen aus gespeicherten Trainings – nötig, wenn ein
 * nachgetragenes Training bearbeitet oder gelöscht wurde (docs/MANUAL_ENTRY.md §4).
 */

export interface StoredSet extends SetValues {
  setType: SetType
  completed: boolean
  completedAt?: string | undefined
}

export interface StoredExercise {
  exerciseSlug: string
  block: BlockType
  sets: StoredSet[]
}

export interface StoredSession {
  sessionId: string
  startedAt: string
  exercises: StoredExercise[]
}

export interface OfferedRecord extends RecordCandidate {
  sessionId: string
}

/**
 * Beste Leistung je Übung, Art und Bedingung über alle Trainings – nur für `slugs`.
 * Bei Gleichstand zählt das frühere Training (dort wurde der Rekord zuerst erreicht).
 */
export function bestRecordsAcross(
  sessions: readonly StoredSession[],
  slugs: readonly string[],
  measurementOf: (slug: string) => Measurement | undefined,
): OfferedRecord[] {
  const wanted = new Set(slugs)
  const best = new Map<string, OfferedRecord>()
  const chronological = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt))

  for (const stored of chronological) {
    const session: ActiveSession = {
      id: stored.sessionId,
      startedAt: stored.startedAt,
      finishedAt: stored.startedAt,
      workout: undefined as unknown as ActiveSession['workout'],
      cursor: 0,
      pausedSec: 0,
      exercises: stored.exercises.flatMap((exercise, index) => {
        const measurement = measurementOf(exercise.exerciseSlug)
        if (!wanted.has(exercise.exerciseSlug) || !measurement) return []
        return [
          {
            id: `${stored.sessionId}-${index}`,
            exerciseSlug: exercise.exerciseSlug,
            exerciseName: exercise.exerciseSlug,
            measurement,
            role: 'accessory' as const,
            block: exercise.block,
            inCircuit: false,
            skipped: false,
            sets: exercise.sets.map((set, setIndex) => ({
              id: `${stored.sessionId}-${index}-${setIndex}`,
              setNumber: setIndex + 1,
              type: set.setType,
              target: { restSec: 0 },
              actual: {
                reps: set.reps,
                weightKg: set.weightKg,
                distanceM: set.distanceM,
                durationSec: set.durationSec,
              },
              completed: set.completed,
              completedAt: set.completedAt ?? stored.startedAt,
            })),
          },
        ]
      }),
    }
    for (const candidate of detectRecords(session)) {
      const key = `${candidate.exerciseSlug}|${candidate.recordType}|${candidate.contextKey}`
      const current = best.get(key)
      if (current && !isBetter(candidate.recordType, candidate.value, current.value)) continue
      best.set(key, { ...candidate, sessionId: stored.sessionId })
    }
  }
  return [...best.values()]
}
