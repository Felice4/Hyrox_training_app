import type { HistorySession, HistorySet } from '@/domain/generator/types'
import { describeTarget } from './format'

export interface LastPerformance {
  /** ISO-Zeitpunkt des Trainings */
  date: string
  /** z. B. „3 × 5 Wdh. · 100 kg, 1 × 3 Wdh. · 105 kg" */
  text: string
}

/**
 * Abgehakte Arbeitssätze als Text; gleiche Sätze hintereinander werden zusammengefasst,
 * z. B. „3 × 5 Wdh. · 100 kg, 1 × 3 Wdh. · 105 kg". Leer, wenn nichts geschafft wurde.
 */
export function summarizeSets(sets: readonly HistorySet[]): string {
  const labels = sets
    .filter((s) => s.completed && s.setType !== 'warmup')
    .map((s) =>
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
  return groups
    .filter((g) => g.label !== '')
    .map((g) => (g.count > 1 ? `${g.count} × ${g.label}` : g.label))
    .join(', ')
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
    const text = summarizeSets(
      session.exercises.filter((e) => e.exerciseSlug === exerciseSlug).flatMap((e) => e.sets),
    )
    if (text) return { date: session.startedAt, text }
  }
  return undefined
}
