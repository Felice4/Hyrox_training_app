import type { SessionDetail } from '@/api/sessionHistory'
import type { Measurement } from '@/data/exercises/vocabulary'
import type { EntryBlock, ManualEntry } from '@/domain/manualEntry/entry'
import { toLocalIsoDate } from '@/lib/date'

const ENTRY_BLOCK: Partial<Record<string, EntryBlock>> = {
  warmup: 'warmup',
  cooldown: 'cooldown',
}

/**
 * Gespeichertes nachgetragenes Training → Formular zum Bearbeiten. Gleiche IDs, damit
 * das erneute Speichern das Training ändert statt ein neues anzulegen.
 * `null`, wenn das Training aus dem Trainingsmodus stammt (nicht bearbeitbar).
 */
export function entryFromDetail(
  detail: SessionDetail,
  measurementOf: (slug: string) => Measurement | undefined,
  newId: () => string,
): ManualEntry | null {
  if (detail.source === 'app') return null
  const start = new Date(detail.startedAt)
  const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
  const durationMin = Math.max(
    1,
    Math.round((Date.parse(detail.endedAt) - Date.parse(detail.startedAt)) / 60_000),
  )
  return {
    id: detail.id,
    source: detail.source,
    date: toLocalIsoDate(start),
    time,
    durationMin,
    focus: detail.focus,
    title: detail.title ?? undefined,
    coach: detail.coach ?? undefined,
    sessionRpe: detail.rpe,
    notes: detail.notes ?? undefined,
    plannedWorkoutId: detail.plannedWorkoutId ?? undefined,
    exercises: detail.exercises.flatMap((exercise) => {
      const measurement = exercise.slug ? measurementOf(exercise.slug) : undefined
      if (!exercise.slug || !measurement) return []
      return [
        {
          id: exercise.id,
          exerciseSlug: exercise.slug,
          exerciseName: exercise.name,
          measurement,
          block: ENTRY_BLOCK[exercise.block] ?? 'main',
          sets: exercise.sets.map((set) => ({ id: set.id ?? newId(), values: { ...set.actual } })),
        },
      ]
    }),
  }
}
