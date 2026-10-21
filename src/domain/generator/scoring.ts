import type { HyroxStation, MuscleGroup, TrainingType } from '@/data/exercises/vocabulary'
import { fatigueLevel, type MuscleFatigue } from '@/domain/load/muscleFatigue'
import type { HistoryIndex } from './pool'
import type { Focus, GeneratorExercise, GoalWeights, SlotRole } from './types'

/** Startwerte der Bewertung (docs/GENERATOR.md, Schritt 6). */
export const SCORING = {
  goalFitMax: 3,
  preferred: 2,
  disliked: -3,
  usedInLastTwoSameFocus: -2.5,
  usedInLastWeek: -1,
  fatigueMedium: -2,
  fatigueHigh: -4,
  stationCoverage: 2,
  stationCoverageDays: 10,
  userWish: 5,
  continuity: 1,
  /** Aus den besten N Kandidaten wird per Seed gewählt */
  topCandidates: 3,
}

/** Rollen, bei denen Muskelermüdung keine Rolle spielt (locker, Mobilität). */
const FATIGUE_EXEMPT_ROLES: readonly SlotRole[] = [
  'warmup_cardio',
  'warmup_drill',
  'steady',
  'mobility',
  'cooldown_cardio',
  'stretch',
]

/** Rollen, in denen stark ermüdete Muskeln gar nicht primär trainiert werden. */
export function excludesFatiguedMuscles(role: SlotRole): boolean {
  return !FATIGUE_EXEMPT_ROLES.includes(role)
}

const GOALS_BY_TYPE: Partial<Record<TrainingType, readonly (keyof GoalWeights)[]>> = {
  strength: ['strength'],
  power: ['strength', 'hyrox'],
  hypertrophy: ['hypertrophy'],
  conditioning: ['hyrox', 'endurance'],
  endurance: ['endurance', 'hyrox'],
}

/** Passung zu den gewichteten Zielen: 0 … 3 */
export function goalFit(exercise: GeneratorExercise, goals: GoalWeights): number {
  const maxWeight = Math.max(goals.hypertrophy, goals.strength, goals.endurance, goals.hyrox, 1)
  const relevant = new Set<keyof GoalWeights>()
  exercise.trainingTypes.forEach((t) => GOALS_BY_TYPE[t]?.forEach((g) => relevant.add(g)))
  if (exercise.category === 'hyrox') relevant.add('hyrox')
  const best = Math.max(0, ...[...relevant].map((g) => goals[g]))
  return Math.round((SCORING.goalFitMax * best * 100) / maxWeight) / 100
}

export interface ScoringContext {
  goals: GoalWeights
  focus: Focus
  fatigue: MuscleFatigue
  history: HistoryIndex
  targetMuscles: readonly MuscleGroup[]
  hyroxStations: readonly HyroxStation[]
}

/** Gesamtpunktzahl eines Kandidaten für eine Rolle. */
export function scoreCandidate(
  exercise: GeneratorExercise,
  role: SlotRole,
  ctx: ScoringContext,
): number {
  let score = goalFit(exercise, ctx.goals)

  if (exercise.preference === 'preferred') score += SCORING.preferred
  if (exercise.preference === 'disliked') score += SCORING.disliked

  if (ctx.history.recentSameFocus.has(exercise.slug)) score += SCORING.usedInLastTwoSameFocus
  else if ((ctx.history.daysSinceUsed.get(exercise.slug) ?? Infinity) < 7) {
    score += SCORING.usedInLastWeek
  }

  if (excludesFatiguedMuscles(role)) {
    const levels = exercise.primaryMuscles.map((m) => fatigueLevel(ctx.fatigue[m]))
    if (levels.includes('high')) score += SCORING.fatigueHigh
    else if (levels.includes('medium')) score += SCORING.fatigueMedium
  }

  const station = exercise.hyroxStation
  if (station && (ctx.focus === 'hyrox' || ctx.focus === 'mixed')) {
    const days = ctx.history.daysSinceStation.get(station) ?? Infinity
    if (days >= SCORING.stationCoverageDays) score += SCORING.stationCoverage
  }

  if (exercise.primaryMuscles.some((m) => ctx.targetMuscles.includes(m))) score += SCORING.userWish
  if (station && ctx.hyroxStations.includes(station)) score += SCORING.userWish

  if (role === 'strength_main' && (ctx.history.usageCount.get(exercise.slug) ?? 0) >= 2) {
    score += SCORING.continuity
  }
  return Math.round(score * 100) / 100
}
