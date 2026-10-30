import type { CatalogExercise } from '@/api/exercises'
import type { ProfileDetails } from '@/api/profile'
import type { PlannedWorkout } from '@/api/weekPlans'
import {
  ruleBasedGenerator,
  type GeneratedWorkout,
  type HistorySession,
  type ReadinessInput,
  type WorkoutRequest,
} from '@/domain/generator'
import { generateWeekPlan, type GeneratedWeekPlan } from '@/domain/generator/weekPlan'
import { toGeneratorProfile, toGoalWeights } from '@/features/generator/inputs'
import { doneInWeek, keptForReplan } from './week'

/** Alles, was zum Erzeugen von Workouts und Wochenplänen gebraucht wird. */
export interface PlanningData {
  details: ProfileDetails
  exercises: CatalogExercise[]
  history: readonly HistorySession[]
}

/** Erstellt den Wochenplan aus Profil, Verlauf und den bestehenden Einheiten der Woche. */
export function planWeek(
  data: PlanningData,
  weekStart: string,
  today: string,
  planned: readonly PlannedWorkout[],
  seed: number,
): GeneratedWeekPlan {
  const profile = data.details.profile
  return generateWeekPlan({
    weekStart,
    today,
    trainingDaysPerWeek: profile?.training_days_per_week ?? 4,
    preferredWeekdays: profile?.preferred_weekdays ?? [],
    durationMin: profile?.default_duration_min ?? 60,
    profile: toGeneratorProfile(data.details),
    goals: toGoalWeights(data.details),
    exercises: data.exercises,
    history: data.history,
    done: doneInWeek(data.history, weekStart),
    kept: keptForReplan(planned, today),
    seed,
  })
}

/**
 * Erzeugt ein Workout für einen Tag. Für heute zählt die aktuelle Uhrzeit (Ermüdung,
 * Belastung), für spätere Tage – wie beim Wochenplan – der Mittag dieses Tages.
 */
export function generateForDay(
  data: PlanningData,
  request: WorkoutRequest,
  date: string,
  today: string,
  seed: number,
): GeneratedWorkout {
  return ruleBasedGenerator.generateWorkout({
    request,
    profile: toGeneratorProfile(data.details),
    goals: toGoalWeights(data.details),
    exercises: data.exercises,
    history: data.history,
    now: date === today ? new Date().toISOString() : `${date}T12:00:00.000Z`,
    seed,
  })
}

/**
 * Anfrage, mit der eine geplante Einheit neu erzeugt wird (Schwerpunkt und Dauer bleiben).
 * `readiness`: Check-in von heute – nur für Einheiten am heutigen Tag sinnvoll.
 */
export function requestFor(planned: PlannedWorkout, readiness?: ReadinessInput): WorkoutRequest {
  return {
    durationMin: planned.durationMin,
    focus: planned.focus,
    intensity: planned.intensity,
    readiness: readiness ?? { kind: 'quick', level: 'normal' },
  }
}
