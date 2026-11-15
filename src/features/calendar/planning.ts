import type { CatalogExercise } from '@/api/exercises'
import type { ProfileDetails } from '@/api/profile'
import type { PlannedWorkout } from '@/api/weekPlans'
import {
  ruleBasedGenerator,
  type GeneratedWorkout,
  type HistorySession,
  type RaceSessionType,
  type ReadinessInput,
  type WorkoutRequest,
} from '@/domain/generator'
import { generateWeekPlan, type GeneratedWeekPlan } from '@/domain/generator/weekPlan'
import { raceTimeline, raceWeekOf } from '@/domain/race/phases'
import type { Race } from '@/domain/race/race'
import { RACE_SESSION_FOCUS, raceSessionForDate, raceWeekPlanInput } from '@/domain/race/sessions'
import type { SkillGoal } from '@/domain/skills/goals'
import { toGeneratorProfile, toGoalWeights, toSkillRequest } from '@/features/generator/inputs'
import { doneInWeek, keptForReplan } from './week'

/** Alles, was zum Erzeugen von Workouts und Wochenplänen gebraucht wird. */
export interface PlanningData {
  details: ProfileDetails
  exercises: CatalogExercise[]
  history: readonly HistorySession[]
  /** Skill-Ziele für den Skill-Block (fehlen sie, wird ohne Skills geplant) */
  skillGoals?: readonly SkillGoal[] | undefined
  /** Aktiver Wettkampf – seine Wochen werden im Wettkampfmodus geplant */
  race?: Race | null | undefined
}

/** Liegt die Woche im Plan des aktiven Wettkampfs? */
export function raceWeekFor(data: PlanningData, weekStart: string) {
  return data.race ? raceWeekOf(raceTimeline(data.race), weekStart) : undefined
}

/** Wochenziel an Trainingstagen: im Wettkampfmodus laut Wettkampf, sonst laut Profil. */
export function weekTarget(data: PlanningData, weekStart: string): number | undefined {
  if (data.race && raceWeekFor(data, weekStart)) return data.race.daysPerWeek
  return data.details.profile?.training_days_per_week ?? undefined
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
    skills: toSkillRequest(data.details, data.skillGoals),
    exercises: data.exercises,
    history: data.history,
    done: doneInWeek(data.history, weekStart),
    kept: keptForReplan(planned, today),
    seed,
    race: data.race
      ? raceWeekPlanInput(data.race, weekStart, {
          baseDurationMin: profile?.default_duration_min ?? 60,
          sex: profile?.sex,
          seed,
        })
      : undefined,
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
    skills: toSkillRequest(data.details, data.skillGoals),
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

/**
 * Erzeugt eine geplante Einheit neu. Wettkampf-Einheiten bleiben es (mit Phase, Gewichten
 * und Simulationsformat des Plans), solange der Schwerpunkt passt und der Wettkampf aktiv ist;
 * sonst wird ein normales Workout erzeugt und die Art der Einheit entfernt.
 */
export function regeneratePlanned(
  data: PlanningData,
  planned: Pick<PlannedWorkout, 'date' | 'raceSessionType'>,
  request: WorkoutRequest,
  today: string,
  seed: number,
): { workout: GeneratedWorkout; raceSessionType: RaceSessionType | null } {
  const type = planned.raceSessionType
  const race =
    type && data.race && RACE_SESSION_FOCUS[type] === request.focus
      ? raceSessionForDate(data.race, type, planned.date, {
          sex: data.details.profile?.sex,
          seed,
        })
      : undefined
  if (type && race?.workout) return { workout: race.workout, raceSessionType: type }
  if (type && race?.raceSession) {
    const workout = generateForDay(
      data,
      { ...request, raceSession: race.raceSession },
      planned.date,
      today,
      seed,
    )
    return { workout, raceSessionType: type }
  }
  const workout = generateForDay(
    data,
    { ...request, raceSession: undefined },
    planned.date,
    today,
    seed,
  )
  return { workout, raceSessionType: null }
}
