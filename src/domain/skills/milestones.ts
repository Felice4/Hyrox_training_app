import {
  MILESTONE_AREAS,
  milestoneMetricSchema,
  type MilestoneArea,
  type MilestoneDefinition,
  type MilestoneMetric,
} from '@/data/skills'
import type { HistorySession, HistorySet } from '@/domain/generator/types'
import { estimateOneRepMax } from '@/domain/records/detect'

/**
 * Meilensteine (docs/SKILLS.md §4): Stand aus Bestleistungen, Verlauf, Körpergewicht und
 * HYROX-Zeit, dazu eigene Meilensteine und Änderungen des Nutzers (Migration 0008).
 * Zählt wie die Rekorde: keine Aufwärmsätze, nichts aus Warm-up oder Cool-down.
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

// -----------------------------------------------------------------------------
// Eigene Meilensteine und Änderungen
// -----------------------------------------------------------------------------

/** Zeile aus `user_milestones`: Änderung eines Standard-Meilensteins oder eigener Meilenstein. */
export interface UserMilestone {
  id: string
  /** gesetzt = Änderung eines Standard-Meilensteins; `null` = eigener Meilenstein */
  builtinSlug: string | null
  name: string | null
  area: MilestoneArea | null
  metric: MilestoneMetric | null
  hidden: boolean
  /** „Ab heute neu zählen": ältere Werte werden ignoriert */
  countedFrom: string | null
  manual: { value: number; at: string } | null
}

/** Meilenstein, wie die App ihn zeigt – Standard mit Änderungen oder eigener. */
export interface ResolvedMilestone {
  /** Adresse in der App: Slug des Standard-Meilensteins oder ID des eigenen */
  key: string
  builtin: boolean
  definition: MilestoneDefinition
  /** Unveränderter Standard (nur bei Standard-Meilensteinen) */
  original: MilestoneDefinition | undefined
  /** Name oder Ziel weichen vom Standard ab */
  customized: boolean
  hidden: boolean
  countedFrom: string | null
  manual: { value: number; at: string } | null
  /** ID der Zeile in `user_milestones`, falls vorhanden */
  rowId: string | undefined
}

export function resolveMilestones(
  builtins: readonly MilestoneDefinition[],
  rows: readonly UserMilestone[],
): ResolvedMilestone[] {
  const overrides = new Map(rows.filter((r) => r.builtinSlug).map((r) => [r.builtinSlug!, r]))
  const standard = builtins.map((original): ResolvedMilestone => {
    const row = overrides.get(original.slug)
    const definition: MilestoneDefinition = {
      ...original,
      name: row?.name ?? original.name,
      metric: row?.metric ?? original.metric,
    }
    return {
      key: original.slug,
      builtin: true,
      definition,
      original,
      customized: Boolean(row?.name || row?.metric),
      hidden: row?.hidden ?? false,
      countedFrom: row?.countedFrom ?? null,
      manual: row?.manual ?? null,
      rowId: row?.id,
    }
  })
  const own = rows.flatMap((row): ResolvedMilestone[] =>
    row.builtinSlug === null && row.name && row.area && row.metric
      ? [
          {
            key: row.id,
            builtin: false,
            definition: {
              slug: row.id,
              name: row.name,
              area: row.area,
              series: `custom-${row.id}`,
              metric: row.metric,
            },
            original: undefined,
            customized: false,
            hidden: row.hidden,
            countedFrom: row.countedFrom,
            manual: row.manual,
            rowId: row.id,
          },
        ]
      : [],
  )
  return [...standard, ...own]
}

/** Prüft gespeicherte Werte aus der Datenbank (jsonb) gegen das Schema. */
export function parseMetric(value: unknown): MilestoneMetric | null {
  const result = milestoneMetricSchema.safeParse(value)
  return result.success ? result.data : null
}

export function parseArea(value: string | null): MilestoneArea | null {
  return value && (MILESTONE_AREAS as readonly string[]).includes(value)
    ? (value as MilestoneArea)
    : null
}

/** Einheit, in der Stand, Ziel und Hand-Eintrag angegeben werden. */
export function metricUnit(metric: MilestoneMetric): MilestoneUnit {
  switch (metric.kind) {
    case 'max_reps':
      return 'reps'
    case 'relative_strength':
    case 'max_weight':
      return 'kg'
    case 'best_time':
    case 'hyrox_time':
      return 'sec'
  }
}

/** Der einstellbare Zielwert (Wdh., Faktor, kg oder Sekunden). */
export function metricTarget(metric: MilestoneMetric): number {
  switch (metric.kind) {
    case 'max_reps':
      return metric.reps
    case 'relative_strength':
      return metric.factor
    case 'max_weight':
      return metric.kg
    case 'best_time':
    case 'hyrox_time':
      return metric.maxSec
  }
}

/** Gleiche Messung mit neuem Zielwert. */
export function withTarget(metric: MilestoneMetric, target: number): MilestoneMetric {
  switch (metric.kind) {
    case 'max_reps':
      return { ...metric, reps: Math.round(target) }
    case 'relative_strength':
      return { ...metric, factor: target }
    case 'max_weight':
      return { ...metric, kg: target }
    case 'best_time':
    case 'hyrox_time':
      return { ...metric, maxSec: Math.round(target) }
  }
}

// -----------------------------------------------------------------------------
// Stand berechnen
// -----------------------------------------------------------------------------

export interface MilestoneProgress {
  milestone: MilestoneDefinition
  unit: MilestoneUnit
  /** Bester Wert (ab `countedFrom`) oder `null`, wenn es noch keinen gibt */
  current: number | null
  /** Zielwert (bei × Körpergewicht: Faktor × aktuelles Gewicht) oder `null` ohne Gewicht */
  target: number | null
  achieved: boolean
  /** Fortschritt 0–1 (bei Zeiten: Ziel ÷ aktuelle Zeit) */
  ratio: number
  /** × Körpergewicht braucht einen Gewichts-Eintrag */
  missingBodyWeight: boolean
}

export interface ProgressOptions {
  countedFrom?: string | null
  manual?: { value: number; at: string } | null
}

const MAX_REPS_FOR_1RM = 12

function performedSets(
  history: readonly HistorySession[],
  slugs: readonly string[],
  countedFrom: string | null,
): HistorySet[] {
  return history
    .filter((s) => countedFrom === null || Date.parse(s.startedAt) >= Date.parse(countedFrom))
    .flatMap((session) =>
      session.exercises
        .filter(
          (e) => slugs.includes(e.exerciseSlug) && e.block !== 'warmup' && e.block !== 'cooldown',
        )
        .flatMap((e) => e.sets),
    )
    .filter((s) => s.completed && s.setType !== 'warmup')
}

/** Geschätztes Maximalgewicht je Satz (wie bei den Rekorden bis 12 Wdh.). */
function oneRepMaxes(sets: readonly HistorySet[]): number[] {
  return sets.flatMap((s) =>
    s.weightKg && s.reps && s.reps <= MAX_REPS_FOR_1RM
      ? [estimateOneRepMax(s.weightKg, s.reps)]
      : [],
  )
}

const best = (values: number[], lowerIsBetter: boolean): number | null =>
  values.length === 0 ? null : lowerIsBetter ? Math.min(...values) : Math.max(...values)

export function milestoneProgress(
  milestone: MilestoneDefinition,
  data: MilestoneData,
  options: ProgressOptions = {},
): MilestoneProgress {
  const metric = milestone.metric
  const countedFrom = options.countedFrom ?? null
  // Zeitpunkte als Zahl vergleichen (Datenbank und App formatieren ISO-Zeiten unterschiedlich)
  const valid = (at: string) => countedFrom === null || Date.parse(at) >= Date.parse(countedFrom)
  const manual = options.manual && valid(options.manual.at) ? [options.manual.value] : []

  const recordValues = (slugs: readonly string[], types: readonly string[], context: string) =>
    data.records
      .filter(
        (r) =>
          slugs.includes(r.exerciseSlug) &&
          types.includes(r.recordType) &&
          r.contextKey === context &&
          valid(r.achievedAt),
      )
      .map((r) => r.value)

  const result = (
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
      unit: metricUnit(metric),
      current,
      target,
      achieved,
      ratio: Math.min(Math.max(raw, 0), 1),
      missingBodyWeight: false,
    }
  }

  const strength = (exercise: string) =>
    best(
      [
        ...recordValues([exercise], ['estimated_1rm'], ''),
        ...recordValues([exercise], ['max_weight'], 'reps=1'),
        ...oneRepMaxes(performedSets(data.history, [exercise], countedFrom)),
        ...manual,
      ],
      false,
    )

  switch (metric.kind) {
    case 'max_reps':
      return result(
        best(
          [
            ...recordValues(metric.exercises, ['max_reps'], ''),
            ...performedSets(data.history, metric.exercises, countedFrom).flatMap((s) =>
              s.reps === undefined ? [] : [s.reps],
            ),
            ...manual,
          ],
          false,
        ),
        metric.reps,
        false,
      )
    case 'relative_strength': {
      const weight = data.bodyWeightKg
      const target = weight && weight > 0 ? Math.round(metric.factor * weight * 2) / 2 : null
      return {
        ...result(strength(metric.exercise), target, false),
        missingBodyWeight: target === null,
      }
    }
    case 'max_weight':
      return result(strength(metric.exercise), metric.kg, false)
    case 'best_time':
      return result(
        best(
          [
            ...recordValues(metric.exercises, ['best_time'], `distance_m=${metric.distanceM}`),
            ...performedSets(data.history, metric.exercises, countedFrom).flatMap((s) =>
              s.distanceM === metric.distanceM && s.durationSec ? [s.durationSec] : [],
            ),
            ...manual,
          ],
          true,
        ),
        metric.maxSec,
        true,
      )
    case 'hyrox_time':
      // Die Profil-Zeit hat kein Datum – nach „neu zählen" nur noch Hand-Einträge
      return result(
        best(
          [
            ...(countedFrom === null && data.hyroxBestTimeSec ? [data.hyroxBestTimeSec] : []),
            ...manual,
          ],
          true,
        ),
        metric.maxSec,
        true,
      )
  }
}

/** Stand eines aufgelösten Meilensteins (mit „neu zählen" und Hand-Eintrag). */
export function resolvedProgress(
  milestone: ResolvedMilestone,
  data: MilestoneData,
): MilestoneProgress {
  return milestoneProgress(milestone.definition, data, {
    countedFrom: milestone.countedFrom,
    manual: milestone.manual,
  })
}
