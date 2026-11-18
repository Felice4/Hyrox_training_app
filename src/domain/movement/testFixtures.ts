import { exerciseDefinitionSchema, type ExerciseDefinition } from '@/data/exercises/schema'
import { LOAD } from '@/data/exercises/presets'
import type { ExerciseInput } from '@/data/exercises/schema'

/** Movement-Übung für Tests (die Bibliothek startet leer). */
export function movementExercise(overrides: Partial<ExerciseInput> & { slug: string }) {
  return exerciseDefinitionSchema.parse({
    name: overrides.slug,
    description: 'Testübung für das Movement Lab.',
    category: 'movement',
    movementGroups: ['mobility'],
    trainingTypes: ['mobility'],
    movementPattern: 'mobility',
    primaryMuscles: ['hip_flexors'],
    difficulty: 1,
    measurement: 'time',
    loadParams: LOAD.movementTime,
    instructions: ['Erster Schritt der Übung', 'Zweiter Schritt der Übung'],
    ...overrides,
  } satisfies ExerciseInput) as ExerciseDefinition
}

export const HIP_SWITCH = movementExercise({
  slug: 'movement-hip-switch',
  name: 'Hip Switches',
  measurement: 'reps',
  loadParams: LOAD.movementReps,
  combatSports: ['bjj'],
})
export const SHRIMP = movementExercise({
  slug: 'movement-shrimp',
  name: 'Shrimp',
  movementGroups: ['ground', 'core'],
  combatSports: ['bjj', 'mma'],
  difficulty: 2,
})
export const SKIP = movementExercise({
  slug: 'movement-boxer-skip',
  name: 'Boxer Skip',
  movementGroups: ['footwork'],
  combatSports: ['boxing'],
})
export const BREATHING = movementExercise({
  slug: 'movement-box-breathing',
  name: 'Box Breathing',
  movementGroups: ['breathing'],
  loadParams: LOAD.movementFlow,
})

export const MOVEMENT_FIXTURES = [HIP_SWITCH, SHRIMP, SKIP, BREATHING]
