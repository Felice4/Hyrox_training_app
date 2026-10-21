import type { ProfileDetails } from '@/api/profile'
import { EQUIPMENT, STRESS_REGIONS } from '@/data/exercises/vocabulary'
import { DEFAULT_PROFILE_VALUES } from '@/domain/profile/defaults'
import { TRAINING_LEVELS, type TrainingLevel } from '@/domain/profile/vocabulary'
import {
  FOCUSES,
  INTENSITIES,
  generatedWorkoutSchema,
  type GeneratedWorkout,
  type GeneratorProfile,
  type GoalWeights,
  type WorkoutRequest,
} from '@/domain/generator'

/** Profil- und Zieldaten aus der Datenbank → Eingaben des Generators. */
export function toGeneratorProfile(details: ProfileDetails): GeneratorProfile {
  const profile = details.profile
  const level = TRAINING_LEVELS.find((l) => l === profile?.training_level) as
    TrainingLevel | undefined
  return {
    trainingLevel: level ?? 'intermediate',
    availableEquipment: EQUIPMENT.filter((e) => profile?.available_equipment.includes(e) ?? true),
    limitationRegions: STRESS_REGIONS.filter((r) => profile?.limitation_regions.includes(r)),
  }
}

export function toGoalWeights(details: ProfileDetails): GoalWeights {
  const goals = details.goals
  if (!goals) return { ...DEFAULT_PROFILE_VALUES.goals }
  return {
    hypertrophy: goals.weight_hypertrophy,
    strength: goals.weight_strength,
    endurance: goals.weight_endurance,
    hyrox: goals.weight_hyrox,
  }
}

/** Ein erzeugtes Workout samt Anfrage – lokal gesichert, bis trainiert oder neu erzeugt wird. */
export interface StoredWorkout {
  request: WorkoutRequest
  workout: GeneratedWorkout
}

/** Prüft einen gespeicherten Stand; Unpassendes (z. B. nach einem Update) wird verworfen. */
export function restoreStoredWorkout(stored: unknown): StoredWorkout | null {
  if (typeof stored !== 'object' || stored === null) return null
  const { request, workout } = stored as Record<string, unknown>
  const parsed = generatedWorkoutSchema.safeParse(workout)
  if (!parsed.success || typeof request !== 'object' || request === null) return null
  const r = request as Record<string, unknown>
  if (
    typeof r.durationMin !== 'number' ||
    !FOCUSES.includes(r.focus as never) ||
    !INTENSITIES.includes(r.intensity as never)
  ) {
    return null
  }
  return { request: request as WorkoutRequest, workout: parsed.data }
}

/** Neuer zufälliger Seed (nur in der Oberfläche – der Generator selbst ist deterministisch). */
export function newSeed(): number {
  return Math.floor(Math.random() * 2_147_483_647)
}
