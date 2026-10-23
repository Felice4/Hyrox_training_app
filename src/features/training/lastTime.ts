import type { HistorySession } from '@/domain/generator/types'
import { describeTarget } from './format'

export interface LastPerformance {
  /** ISO-Zeitpunkt des Trainings */
  date: string
  /** z. B. „3 × 5 Wdh. · 100 kg, 1 × 3 Wdh. · 105 kg" */
  text: string
}

/**
 * Was wurde bei dieser Übung zuletzt geschafft? Abgehakte Arbeitssätze des jüngsten
 * Trainings; gleiche Sätze hintereinander werden zusammengefasst.
 */
export function lastPerformance(
  history: readonly HistorySession[],
  exerciseSlug: string,
  before?: string,
): LastPerformance | undefined {
  const sessions = [...history]
    .filter((s) => before === undefined || Date.parse(s.startedAt) < Date.parse(before))
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))

  for (const session of sessions) {
    const sets = session.exercises
      .filter((e) => e.exerciseSlug === exerciseSlug)
      .flatMap((e) => e.sets)
      .filter((s) => s.completed && s.setType !== 'warmup')
    if (sets.length === 0) continue

    const labels = sets.map((s) =>
      describeTarget({
        reps: s.reps,
        weightKg: s.weightKg,
        distanceM: s.distanceM,
        durationSec: s.durationSec,
      }),
    )
    const groups: { label: string; count: number }[] = []
    for (const label of labels) {
      const last = groups.at(-1)
      if (last && last.label === label) last.count += 1
      else groups.push({ label, count: 1 })
    }
    const text = groups
      .filter((g) => g.label !== '')
      .map((g) => (g.count > 1 ? `${g.count} × ${g.label}` : g.label))
      .join(', ')
    if (text) return { date: session.startedAt, text }
  }
  return undefined
}
