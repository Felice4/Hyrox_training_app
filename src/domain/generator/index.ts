import { suggestAlternatives, type AlternativeInput, type ExerciseSuggestion } from './alternatives'
import { GENERATOR_VERSION } from './config'
import { generateWorkout } from './generateWorkout'
import type { GeneratedWorkout, WorkoutRequestInput } from './types'

/**
 * Schnittstelle für Trainingsgeneratoren. Der regelbasierte Generator ist die einzige
 * Umsetzung; eine spätere KI-Variante liefert dieselben Strukturen (Prüfung über
 * `generatedWorkoutSchema`). Die Wochenplanung folgt in Schritt 3.1.
 */
export interface WorkoutGenerator {
  readonly version: string
  generateWorkout(input: WorkoutRequestInput): GeneratedWorkout
  suggestAlternatives(input: AlternativeInput): ExerciseSuggestion[]
}

export const ruleBasedGenerator: WorkoutGenerator = {
  version: GENERATOR_VERSION,
  generateWorkout,
  suggestAlternatives,
}

export { swapExercise } from './alternatives'
export type { AlternativeInput, ExerciseSuggestion, SwapContext } from './alternatives'
export { generatedWorkoutSchema } from './schema'
export * from './types'
