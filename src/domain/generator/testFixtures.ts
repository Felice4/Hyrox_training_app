import { EXERCISE_LIBRARY } from '@/data/exercises'
import { EQUIPMENT } from '@/data/exercises/vocabulary'
import type {
  GeneratorExercise,
  HistorySession,
  HistorySet,
  WorkoutRequest,
  WorkoutRequestInput,
} from './types'

/** Gemeinsame Testdaten für Generator-Tests (kein Produktionscode). */
export const NOW = '2026-10-21T17:00:00.000Z'

export const LIBRARY: GeneratorExercise[] = EXERCISE_LIBRARY.map((e) => ({
  ...e,
  preference: 'neutral',
}))

export function makeInput(
  request: Partial<WorkoutRequest> = {},
  overrides: Partial<Omit<WorkoutRequestInput, 'request'>> = {},
): WorkoutRequestInput {
  return {
    request: { durationMin: 60, focus: 'strength', intensity: 'moderate', ...request },
    profile: {
      trainingLevel: 'intermediate',
      availableEquipment: [...EQUIPMENT],
      limitationRegions: [],
    },
    goals: { hypertrophy: 25, strength: 25, endurance: 25, hyrox: 25 },
    exercises: LIBRARY,
    history: [],
    now: NOW,
    seed: 1,
    ...overrides,
  }
}

export const workSets = (count: number, reps = 6, rpe = 8): HistorySet[] =>
  Array.from({ length: count }, () => ({ setType: 'working', completed: true, reps, rpe }))

/** Schweres Beintraining vor `hoursAgo` Stunden. */
export function heavyLegDay(hoursAgo = 20): HistorySession {
  return {
    startedAt: new Date(Date.parse(NOW) - hoursAgo * 3600 * 1000).toISOString(),
    focus: 'strength',
    durationMin: 70,
    sessionRpe: 8,
    exercises: [
      { exerciseSlug: 'back-squat', sets: workSets(5, 5, 8.5) },
      { exerciseSlug: 'romanian-deadlift', sets: workSets(4, 8, 8) },
      { exerciseSlug: 'bulgarian-split-squat', sets: workSets(3, 10, 8) },
      { exerciseSlug: 'leg-press', sets: workSets(4, 12, 8) },
    ],
  }
}
