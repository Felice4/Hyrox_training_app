import type { Measurement } from '@/data/exercises/vocabulary'
import type { HistorySession, HistorySet } from '@/domain/generator/types'
import { estimateOneRepMax } from '@/domain/records/detect'
import { toLocalIsoDate } from '@/lib/date'

/**
 * Fortschritt einer Übung über die Zeit. Verglichen wird nur Vergleichbares
 * (SPEC §9): Kraft über das geschätzte Maximalgewicht bzw. Gewicht bei gleicher
 * Wiederholungszahl, Ausdauer und Stationen nur bei gleicher Strecke bzw. Dauer.
 */

export type ProgressMetric = 'e1rm' | 'max_reps' | 'max_weight' | 'pace' | 'distance' | 'duration'

export interface ProgressPoint {
  /** ISO-Zeitpunkt des Trainings */
  startedAt: string
  /** Lokales Datum „JJJJ-MM-TT" */
  date: string
  value: number
  /** Bester Satz in diesem Training (für Tooltip/Tabelle) */
  set: HistorySet
}

/** Eine Reihe vergleichbarer Werte, z. B. alle 1-km-Läufe. */
export interface ProgressSeries {
  key: string
  /** Bedingung, z. B. Strecke in Metern; `undefined` = ohne Bedingung */
  distanceM?: number | undefined
  durationSec?: number | undefined
  points: ProgressPoint[]
}

export interface RepBest {
  reps: number
  weightKg: number
  date: string
}

export interface ExerciseProgress {
  metric: ProgressMetric
  lowerIsBetter: boolean
  /** Vergleichbare Reihen, die mit den meisten Trainings zuerst */
  series: ProgressSeries[]
  /** Kraft: kg × Wdh. je Training; nur Wiederholungen: Wdh. gesamt */
  volume: { startedAt: string; date: string; value: number }[]
  /** Kraft: bestes Gewicht je Wiederholungszahl */
  repBests: RepBest[]
  /** Anzahl Trainings mit dieser Übung */
  sessions: number
}

/** Bis zu dieser Wiederholungszahl ist eine 1RM-Schätzung sinnvoll (wie bei den Rekorden). */
const MAX_REPS_FOR_1RM = 12

/** Gewertete Sätze: abgehakt, keine Aufwärmsätze, nicht aus Warm-up/Cool-down. */
function performedSets(session: HistorySession, slug: string): HistorySet[] {
  return session.exercises
    .filter((e) => e.exerciseSlug === slug && e.block !== 'warmup' && e.block !== 'cooldown')
    .flatMap((e) => e.sets)
    .filter((s) => s.completed && s.setType !== 'warmup')
}

const METRIC: Record<Measurement, ProgressMetric | null> = {
  weight_reps: 'e1rm',
  reps: 'max_reps',
  weight_distance: 'max_weight',
  weight_time: 'max_weight',
  distance_time: 'pace',
  distance: 'distance',
  time: 'duration',
  // Kalorien werden im Verlauf (noch) nicht gespeichert
  calories: null,
}

/** Pace in Sekunden je `paceBase` Meter (1000 = min/km, 500 = Ruder-/Ski-Pace). */
export const pace = (durationSec: number, distanceM: number, paceBase: number) =>
  (durationSec / distanceM) * paceBase

/**
 * Wertet den Verlauf für eine Übung aus. `null`, wenn die Messart nicht auswertbar ist.
 * Trainings ohne gewertete Sätze werden übersprungen.
 */
export function exerciseProgress(
  sessions: readonly HistorySession[],
  slug: string,
  measurement: Measurement,
  paceBase = 1000,
): ExerciseProgress | null {
  const metric = METRIC[measurement]
  if (!metric) return null

  const chronological = [...sessions].sort(
    (a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt),
  )
  const groups = new Map<string, ProgressSeries>()
  const volume: ExerciseProgress['volume'] = []
  const repBests = new Map<number, RepBest>()
  let count = 0

  const offer = (
    key: string,
    condition: Pick<ProgressSeries, 'distanceM' | 'durationSec'>,
    point: ProgressPoint,
    lowerIsBetter: boolean,
  ) => {
    const series = groups.get(key) ?? { key, ...condition, points: [] }
    const last = series.points.at(-1)
    // Pro Training zählt der beste Satz
    if (last && last.startedAt === point.startedAt) {
      const better = lowerIsBetter ? point.value < last.value : point.value > last.value
      if (better) series.points[series.points.length - 1] = point
    } else {
      series.points.push(point)
    }
    groups.set(key, series)
  }

  for (const session of chronological) {
    const sets = performedSets(session, slug)
    if (sets.length === 0) continue
    const date = toLocalIsoDate(new Date(session.startedAt))
    const base = { startedAt: session.startedAt, date }
    let used = false

    for (const set of sets) {
      const { reps, weightKg, distanceM, durationSec } = set
      switch (metric) {
        case 'e1rm':
          if (reps && weightKg) {
            used = true
            if (reps <= MAX_REPS_FOR_1RM) {
              offer('all', {}, { ...base, value: estimateOneRepMax(weightKg, reps), set }, false)
            }
            const best = repBests.get(reps)
            if (!best || weightKg > best.weightKg) repBests.set(reps, { reps, weightKg, date })
          }
          break
        case 'max_reps':
          if (reps) {
            used = true
            offer('all', {}, { ...base, value: reps, set }, false)
          }
          break
        case 'max_weight':
          if (weightKg && (distanceM || durationSec)) {
            used = true
            const key = distanceM ? `d${distanceM}` : `t${durationSec}`
            offer(key, { distanceM, durationSec }, { ...base, value: weightKg, set }, false)
          }
          break
        case 'pace':
          if (distanceM && durationSec) {
            used = true
            offer(
              `d${distanceM}`,
              { distanceM },
              { ...base, value: pace(durationSec, distanceM, paceBase), set },
              true,
            )
          }
          break
        case 'distance':
          if (distanceM) {
            used = true
            offer('all', {}, { ...base, value: distanceM, set }, false)
          }
          break
        case 'duration':
          if (durationSec) {
            used = true
            offer('all', {}, { ...base, value: durationSec, set }, false)
          }
          break
      }
    }

    if (!used) continue
    count += 1
    if (metric === 'e1rm') {
      const kg = sets.reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0)
      volume.push({ ...base, value: Math.round(kg) })
    } else if (metric === 'max_reps') {
      volume.push({ ...base, value: sets.reduce((sum, s) => sum + (s.reps ?? 0), 0) })
    }
  }

  return {
    metric,
    lowerIsBetter: metric === 'pace',
    series: [...groups.values()].sort(
      (a, b) =>
        b.points.length - a.points.length ||
        (a.distanceM ?? a.durationSec ?? 0) - (b.distanceM ?? b.durationSec ?? 0),
    ),
    volume,
    repBests: [...repBests.values()].sort((a, b) => a.reps - b.reps),
    sessions: count,
  }
}

/** Veränderung vom ersten zum letzten Wert einer Reihe (positiv = besser). */
export function improvement(series: ProgressSeries, lowerIsBetter: boolean): number | null {
  const first = series.points[0]
  const last = series.points.at(-1)
  if (!first || !last || series.points.length < 2) return null
  return lowerIsBetter ? first.value - last.value : last.value - first.value
}

/** Übungen, die im Verlauf mit gewerteten Sätzen vorkommen (Anzahl Trainings je Übung). */
export function trainedExercises(sessions: readonly HistorySession[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const session of sessions) {
    const slugs = new Set(
      session.exercises
        .filter((e) => e.block !== 'warmup' && e.block !== 'cooldown')
        .filter((e) => e.sets.some((s) => s.completed && s.setType !== 'warmup'))
        .map((e) => e.exerciseSlug),
    )
    for (const slug of slugs) counts.set(slug, (counts.get(slug) ?? 0) + 1)
  }
  return counts
}
