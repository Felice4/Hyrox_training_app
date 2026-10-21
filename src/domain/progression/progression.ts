import type { Equipment, MovementPattern } from '@/data/exercises/vocabulary'
import type { HistoryExercise, HistorySession } from '@/domain/generator/types'

/** Kleinste sinnvolle Gewichtsstufe je Gerät (kg). */
export function weightStep(equipment: readonly Equipment[]): number {
  if (equipment.includes('dumbbell')) return 1
  if (equipment.includes('kettlebell')) return 2
  return 2.5
}

/** Rundet auf die verfügbare Gewichtsabstufung. */
export function roundToStep(weight: number, step: number, mode: 'nearest' | 'down' = 'nearest') {
  const steps = weight / step
  const rounded = mode === 'down' ? Math.floor(steps + 1e-9) : Math.round(steps)
  return Math.max(step, Math.round(rounded * step * 100) / 100)
}

const LOWER_BODY_PATTERNS: readonly MovementPattern[] = ['squat', 'hinge', 'lunge']

/**
 * Steigerung bei erfülltem Ziel: Langhantel/Trap Bar im Unterkörper 5 kg, sonst kleinste Stufe.
 * Begrenzt auf +5 % – ist die kleinste Stufe größer, bleibt das Gewicht gleich.
 */
export function progressionIncrement(
  weight: number,
  equipment: readonly Equipment[],
  pattern: MovementPattern,
): number {
  const step = weightStep(equipment)
  const isHeavyLower =
    (equipment.includes('barbell') || equipment.includes('trap_bar')) &&
    LOWER_BODY_PATTERNS.includes(pattern)
  const preferred = isHeavyLower ? 5 : step
  const cap = weight * 0.05
  if (preferred <= cap) return preferred
  return step <= cap ? step : 0
}

export interface ProgressionExercise {
  slug: string
  equipment: readonly Equipment[]
  movementPattern: MovementPattern
}

export interface ProgressionSuggestion {
  weightKg: number | undefined
  note: string
}

interface Performance {
  startedAt: string
  sets: HistoryExercise['sets']
}

function lastPerformances(slug: string, history: readonly HistorySession[]): Performance[] {
  return history
    .flatMap((session) =>
      session.exercises
        .filter((e) => e.exerciseSlug === slug)
        .map((e) => ({
          startedAt: session.startedAt,
          sets: e.sets.filter(
            (s) => s.completed && s.setType === 'working' && s.weightKg !== undefined,
          ),
        })),
    )
    .filter((p) => p.sets.length > 0)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
}

const fmt = (kg: number) => `${String(kg).replace('.', ',')} kg`

/**
 * Gewichtsvorschlag nach doppelter Progression – ausschließlich aus eigener Leistung
 * (docs/GENERATOR.md, Schritt 7). `targetReps` = heute geplante Wiederholungen pro Satz.
 */
export function suggestWeight(
  exercise: ProgressionExercise,
  targetReps: number,
  history: readonly HistorySession[],
  loadFactor = 1,
): ProgressionSuggestion {
  const performances = lastPerformances(exercise.slug, history)
  const last = performances[0]
  if (!last) {
    return {
      weightKg: undefined,
      note: 'Startgewicht wählen, das sich wie RPE 6–7 anfühlt (3–4 Wiederholungen Reserve).',
    }
  }

  const step = weightStep(exercise.equipment)
  const lastWeight = Math.max(...last.sets.map((s) => s.weightKg ?? 0))
  const topSets = last.sets.filter((s) => s.weightKg === lastWeight)
  const goal = (s: (typeof topSets)[number]) => s.targetReps ?? targetReps
  const rpes = topSets.map((s) => s.rpe).filter((r): r is number => r !== undefined)
  const avgRpe = rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : undefined
  const reached = topSets.every((s) => (s.reps ?? 0) >= goal(s))
  const clearlyMissed = (p: Performance) =>
    p.sets.some((s) => (s.reps ?? 0) <= (s.targetReps ?? targetReps) - 2)

  let weight = lastWeight
  let note: string
  const repsText = `${topSets.length} × ${topSets.map((s) => s.reps ?? 0).join('/')}`

  if (reached && (avgRpe === undefined || avgRpe <= 8)) {
    const increment = progressionIncrement(lastWeight, exercise.equipment, exercise.movementPattern)
    if (increment > 0) {
      weight = roundToStep(lastWeight + increment, step)
      note = `Letztes Mal ${repsText} mit ${fmt(lastWeight)} geschafft → heute +${fmt(increment)}.`
    } else {
      note = `Ziel erreicht – nächste Stufe wäre mehr als +5 %, daher mehr Wiederholungen anpeilen.`
    }
  } else if (reached) {
    note = `Ziel erreicht, aber sehr anstrengend (RPE ${String(avgRpe).replace('.', ',')}) → Gewicht halten.`
  } else if (performances[1] && clearlyMissed(last) && clearlyMissed(performances[1])) {
    weight = roundToStep(lastWeight * 0.925, step, 'down')
    note = `Zweimal deutlich unter dem Ziel → Gewicht leicht reduziert (${fmt(lastWeight)} → ${fmt(weight)}).`
  } else {
    note = `Letztes Mal ${repsText} mit ${fmt(lastWeight)} → Gewicht halten, Ziel ${targetReps} Wiederholungen.`
  }

  if (loadFactor < 1) {
    const reduced = roundToStep(weight * loadFactor, step, 'down')
    note += ` Wegen der Tagesform heute ${fmt(reduced)}.`
    weight = reduced
  }
  return { weightKg: weight, note }
}
