import type { MuscleGroup } from '@/data/exercises/vocabulary'
import { FATIGUE } from '@/domain/generator/config'
import type { GeneratorExercise, HistorySession } from '@/domain/generator/types'

const HOUR_MS = 60 * 60 * 1000

export type FatigueLevel = 'low' | 'medium' | 'high'

export type MuscleFatigue = Partial<Record<MuscleGroup, number>>

/**
 * Ermüdung je Muskelgruppe aus den Trainings der letzten 96 h (docs/GENERATOR.md, Schritt 4):
 * Σ abgeschlossene Arbeitssätze × Muskelgewicht (primär 1 / sekundär 0,5) × RPE-Faktor × Abklingen.
 */
export function computeMuscleFatigue(
  history: readonly HistorySession[],
  exercises: readonly Pick<GeneratorExercise, 'slug' | 'primaryMuscles' | 'secondaryMuscles'>[],
  now: string,
): MuscleFatigue {
  const bySlug = new Map(exercises.map((e) => [e.slug, e]))
  const nowMs = Date.parse(now)
  const fatigue: MuscleFatigue = {}

  for (const session of history) {
    const hours = (nowMs - Date.parse(session.startedAt)) / HOUR_MS
    if (hours < 0 || hours > FATIGUE.windowHours) continue

    for (const performed of session.exercises) {
      const exercise = bySlug.get(performed.exerciseSlug)
      if (!exercise) continue
      const workSets = performed.sets.filter((s) => s.completed && s.setType !== 'warmup')
      const setLoad = workSets.reduce(
        (sum, s) => sum + FATIGUE.rpeFactor(s.rpe ?? session.sessionRpe),
        0,
      )
      if (setLoad === 0) continue

      const add = (muscle: MuscleGroup, weight: number) => {
        const recovery = FATIGUE.isLarge(muscle)
          ? FATIGUE.recoveryHoursLarge
          : FATIGUE.recoveryHoursSmall
        const decay = Math.max(0, 1 - hours / recovery)
        if (decay === 0) return
        fatigue[muscle] = (fatigue[muscle] ?? 0) + setLoad * weight * decay
      }
      exercise.primaryMuscles.forEach((m) => add(m, FATIGUE.primaryWeight))
      exercise.secondaryMuscles.forEach((m) => add(m, FATIGUE.secondaryWeight))
    }
  }

  for (const muscle of Object.keys(fatigue) as MuscleGroup[]) {
    fatigue[muscle] = Math.round((fatigue[muscle] ?? 0) * 10) / 10
  }
  return fatigue
}

export function fatigueLevel(value: number | undefined): FatigueLevel {
  if (value === undefined || value < FATIGUE.medium) return 'low'
  return value >= FATIGUE.high ? 'high' : 'medium'
}
