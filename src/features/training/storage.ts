import { generatedWorkoutSchema } from '@/domain/generator/schema'
import type { ActiveSession } from '@/domain/session/types'
import { DIVISIONS, SIMULATION_FORMATS } from '@/domain/simulation/formats'

/** Schlüssel für lokal gesicherte Daten (je Nutzer). */
export const storageKeys = {
  generatedWorkout: (userId: string) => `hyrox-coach:generated-workout:${userId}`,
  activeSession: (userId: string) => `hyrox-coach:active-session:${userId}`,
}

/**
 * Prüft ein lokal gesichertes Training. Beschädigtes oder veraltetes wird verworfen,
 * statt die App durcheinanderzubringen.
 */
export function restoreActiveSession(stored: unknown): ActiveSession | null {
  if (typeof stored !== 'object' || stored === null) return null
  const s = stored as Partial<ActiveSession>
  const valid =
    typeof s.id === 'string' &&
    typeof s.startedAt === 'string' &&
    typeof s.cursor === 'number' &&
    typeof s.pausedSec === 'number' &&
    (s.plannedWorkoutId === undefined || typeof s.plannedWorkoutId === 'string') &&
    (s.readinessCheckinId === undefined || typeof s.readinessCheckinId === 'string') &&
    (s.simulation === undefined ||
      (SIMULATION_FORMATS.includes(s.simulation?.format) &&
        DIVISIONS.includes(s.simulation?.division))) &&
    Array.isArray(s.exercises) &&
    s.exercises.every(
      (e) =>
        typeof e?.id === 'string' &&
        typeof e.exerciseSlug === 'string' &&
        Array.isArray(e.sets) &&
        e.sets.every((set) => typeof set?.id === 'string' && typeof set.completed === 'boolean'),
    ) &&
    generatedWorkoutSchema.safeParse(s.workout).success
  return valid ? (stored as ActiveSession) : null
}
