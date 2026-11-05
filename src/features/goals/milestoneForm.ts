import type { ExerciseDefinition } from '@/data/exercises'
import type { Measurement } from '@/data/exercises/vocabulary'
import { milestoneMetricSchema, type MilestoneArea, type MilestoneMetric } from '@/data/skills'
import { metricTarget, metricUnit } from '@/domain/skills/milestones'
import { formatDurationClock, parseDuration } from '@/lib/time'

/** Arten, die ein eigener Meilenstein haben kann (HYROX-Zeit gibt es nur als Standard). */
export const CUSTOM_KINDS = ['max_reps', 'max_weight', 'relative_strength', 'best_time'] as const
export type CustomKind = (typeof CUSTOM_KINDS)[number]

export const CUSTOM_KIND_LABELS: Record<CustomKind, string> = {
  max_reps: 'Wiederholungen am Stück',
  max_weight: 'Gewicht (kg)',
  relative_strength: 'Gewicht × Körpergewicht',
  best_time: 'Zeit über eine Strecke',
}

/** Welche Übungen zu einer Art passen (nach Messart). */
const KIND_MEASUREMENTS: Record<CustomKind, readonly Measurement[]> = {
  max_reps: ['reps', 'weight_reps'],
  max_weight: ['weight_reps'],
  relative_strength: ['weight_reps'],
  best_time: ['distance_time'],
}

export function exercisesForKind<E extends Pick<ExerciseDefinition, 'measurement' | 'name'>>(
  exercises: readonly E[],
  kind: CustomKind,
): E[] {
  return exercises
    .filter((e) => KIND_MEASUREMENTS[kind].includes(e.measurement))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

/** Bereich, der zu einer Art passt (vorbelegt, änderbar). */
export const DEFAULT_AREA: Record<CustomKind, MilestoneArea> = {
  max_reps: 'other',
  max_weight: 'strength',
  relative_strength: 'strength',
  best_time: 'run',
}

export interface MilestoneDraft {
  name: string
  area: MilestoneArea
  kind: CustomKind
  exercise: string
  distanceM: string
  target: string
}

export const emptyDraft = (): MilestoneDraft => ({
  name: '',
  area: 'other',
  kind: 'max_reps',
  exercise: '',
  distanceM: '',
  target: '',
})

const number = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2, useGrouping: false })

/** Zielwert so, wie er im Eingabefeld steht (Zeit als „m:ss", Zahlen mit Komma). */
export function formatTargetInput(metric: MilestoneMetric): string {
  const target = metricTarget(metric)
  return metricUnit(metric) === 'sec' ? formatDurationClock(target) : number.format(target)
}

/** Zielwert aus dem Eingabefeld; `null` = ungültig. */
export function parseTargetInput(kind: MilestoneMetric['kind'], input: string): number | null {
  if (kind === 'best_time' || kind === 'hyrox_time') return parseDuration(input)
  const value = Number(input.trim().replace(',', '.'))
  if (!Number.isFinite(value) || value <= 0) return null
  if (kind === 'max_reps') return Number.isInteger(value) && value <= 10_000 ? value : null
  if (kind === 'relative_strength') return value <= 5 ? value : null
  return value <= 1000 ? value : null
}

export const TARGET_HINTS: Record<MilestoneMetric['kind'], string> = {
  max_reps: 'Wiederholungen am Stück, z. B. 100',
  max_weight: 'Maximalgewicht in kg (1 Wiederholung bzw. geschätzt), z. B. 140',
  relative_strength: 'Faktor des Körpergewichts, z. B. 1,5',
  best_time: 'Zielzeit als m:ss oder h:mm:ss, z. B. 3:30',
  hyrox_time: 'Zielzeit als h:mm:ss, z. B. 1:15:00',
}

export function draftFromMetric(
  name: string,
  area: MilestoneArea,
  metric: MilestoneMetric,
): MilestoneDraft {
  const base = { name, area, target: formatTargetInput(metric), distanceM: '' }
  switch (metric.kind) {
    case 'max_reps':
      return { ...base, kind: 'max_reps', exercise: metric.exercises[0] ?? '' }
    case 'best_time':
      return {
        ...base,
        kind: 'best_time',
        exercise: metric.exercises[0] ?? '',
        distanceM: String(metric.distanceM),
      }
    case 'max_weight':
    case 'relative_strength':
      return { ...base, kind: metric.kind, exercise: metric.exercise }
    case 'hyrox_time':
      // Kommt bei eigenen Meilensteinen nicht vor
      return { ...base, kind: 'max_reps', exercise: '' }
  }
}

export type DraftErrors = Partial<Record<'name' | 'exercise' | 'distanceM' | 'target', string>>

export type DraftResult =
  | { ok: true; name: string; area: MilestoneArea; metric: MilestoneMetric }
  | { ok: false; errors: DraftErrors }

/** Prüft das Formular für einen eigenen Meilenstein. */
export function validateDraft(
  draft: MilestoneDraft,
  knownExercises: ReadonlySet<string>,
): DraftResult {
  const errors: DraftErrors = {}
  const name = draft.name.trim()
  if (name.length < 3 || name.length > 60) errors.name = 'Name mit 3 bis 60 Zeichen.'
  if (!knownExercises.has(draft.exercise)) errors.exercise = 'Bitte eine Übung wählen.'
  const target = parseTargetInput(draft.kind, draft.target)
  if (target === null) errors.target = `Ungültig – ${TARGET_HINTS[draft.kind]}.`
  const distance = Number(draft.distanceM)
  if (
    draft.kind === 'best_time' &&
    !(Number.isInteger(distance) && distance > 0 && distance <= 100_000)
  ) {
    errors.distanceM = 'Strecke in ganzen Metern, z. B. 1000.'
  }
  if (Object.keys(errors).length > 0 || target === null) return { ok: false, errors }

  const metric: MilestoneMetric =
    draft.kind === 'max_reps'
      ? { kind: 'max_reps', exercises: [draft.exercise], reps: target }
      : draft.kind === 'best_time'
        ? { kind: 'best_time', exercises: [draft.exercise], distanceM: distance, maxSec: target }
        : draft.kind === 'max_weight'
          ? { kind: 'max_weight', exercise: draft.exercise, kg: target }
          : { kind: 'relative_strength', exercise: draft.exercise, factor: target }
  return { ok: true, name, area: draft.area, metric: milestoneMetricSchema.parse(metric) }
}
