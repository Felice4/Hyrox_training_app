import type { MilestoneDefinition } from '@/data/skills'
import type { HistorySession } from '@/domain/generator/types'

/**
 * Stand der Meilensteine aus Bestleistungen, Verlauf, Körpergewicht und HYROX-Zeit
 * (docs/SKILLS.md §4). Zählt dieselben Werte wie die Rekorde: keine Aufwärmsätze,
 * nichts aus Warm-up oder Cool-down.
 */

export interface MilestoneRecord {
  exerciseSlug: string
  recordType: string
  contextKey: string
  value: number
  achievedAt: string
}

export interface MilestoneData {
  records: readonly MilestoneRecord[]
  history: readonly HistorySession[]
  bodyWeightKg: number | null
  hyroxBestTimeSec: number | null
}

export type MilestoneUnit = 'reps' | 'kg' | 'sec'

export interface MilestoneProgress {
  milestone: MilestoneDefinition
  unit: MilestoneUnit
  /** Bester bisheriger Wert oder `null`, wenn es noch keinen gibt */
  current: number | null
  /** Zielwert (bei Kraft: Faktor × aktuelles Körpergewicht) oder `null` ohne Körpergewicht */
  target: number | null
  achieved: boolean
  /** Fortschritt 0–1 (bei Zeiten: Ziel ÷ aktuelle Zeit) */
  ratio: number
  /** Kraft-Meilensteine brauchen einen Gewichts-Eintrag */
  missingBodyWeight: boolean
}

const best = (values: number[], lowerIsBetter: boolean): number | null =>
  values.length === 0 ? null : lowerIsBetter ? Math.min(...values) : Math.max(...values)

function maxRepsFromHistory(
  history: readonly HistorySession[],
  slugs: readonly string[],
): number[] {
  return history.flatMap((session) =>
    session.exercises
      .filter(
        (e) => slugs.includes(e.exerciseSlug) && e.block !== 'warmup' && e.block !== 'cooldown',
      )
      .flatMap((e) => e.sets)
      .filter((s) => s.completed && s.setType !== 'warmup' && s.reps !== undefined)
      .map((s) => s.reps as number),
  )
}

export function milestoneProgress(
  milestone: MilestoneDefinition,
  data: MilestoneData,
): MilestoneProgress {
  const metric = milestone.metric
  const recordValues = (slugs: readonly string[], types: readonly string[], context: string) =>
    data.records
      .filter(
        (r) =>
          slugs.includes(r.exerciseSlug) &&
          types.includes(r.recordType) &&
          r.contextKey === context,
      )
      .map((r) => r.value)

  const result = (
    unit: MilestoneUnit,
    current: number | null,
    target: number | null,
    lowerIsBetter: boolean,
  ): MilestoneProgress => {
    const achieved =
      current !== null && target !== null && (lowerIsBetter ? current <= target : current >= target)
    const raw =
      current === null || target === null || current <= 0
        ? 0
        : lowerIsBetter
          ? target / current
          : current / target
    return {
      milestone,
      unit,
      current,
      target,
      achieved,
      ratio: Math.min(Math.max(raw, 0), 1),
      missingBodyWeight: false,
    }
  }

  switch (metric.kind) {
    case 'max_reps':
      return result(
        'reps',
        best(
          [
            ...recordValues(metric.exercises, ['max_reps'], ''),
            ...maxRepsFromHistory(data.history, metric.exercises),
          ],
          false,
        ),
        metric.reps,
        false,
      )
    case 'relative_strength': {
      const current = best(
        [
          ...recordValues([metric.exercise], ['estimated_1rm'], ''),
          ...recordValues([metric.exercise], ['max_weight'], 'reps=1'),
        ],
        false,
      )
      const weight = data.bodyWeightKg
      const target = weight && weight > 0 ? Math.round(metric.factor * weight * 2) / 2 : null
      return { ...result('kg', current, target, false), missingBodyWeight: target === null }
    }
    case 'best_time':
      return result(
        'sec',
        best(recordValues(metric.exercises, ['best_time'], `distance_m=${metric.distanceM}`), true),
        metric.maxSec,
        true,
      )
    case 'hyrox_time':
      return result('sec', data.hyroxBestTimeSec, metric.maxSec, true)
  }
}

export interface MilestoneSeriesProgress {
  series: string
  items: MilestoneProgress[]
  achievedCount: number
  /** Nächster offener Meilenstein der Reihe; `undefined` = alle geschafft */
  next: MilestoneProgress | undefined
}

/** Fasst die Meilensteine je Reihe zusammen (Reihenfolge wie in der Bibliothek). */
export function milestoneSeries(
  milestones: readonly MilestoneDefinition[],
  data: MilestoneData,
): MilestoneSeriesProgress[] {
  const groups = new Map<string, MilestoneProgress[]>()
  for (const milestone of milestones) {
    groups.set(milestone.series, [
      ...(groups.get(milestone.series) ?? []),
      milestoneProgress(milestone, data),
    ])
  }
  return [...groups].map(([series, items]) => ({
    series,
    items,
    achievedCount: items.filter((i) => i.achieved).length,
    next: items.find((i) => !i.achieved),
  }))
}
