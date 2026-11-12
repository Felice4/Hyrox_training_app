import type { Measurement } from '@/data/exercises/vocabulary'
import type { BlockType, SetType } from '@/domain/generator/types'
import { toEntryPayload, type ManualEntry } from '@/domain/manualEntry/entry'
import { bestRecordsAcross, type StoredSession } from '@/domain/records/recompute'
import type { AppSupabaseClient } from '@/lib/supabase'
import type { Json } from '@/types/database'
import type { SaveSessionResult } from './sessions'

/**
 * Nachgetragene Trainings und Trainer-Sessions speichern, bearbeiten und löschen
 * (docs/MANUAL_ENTRY.md, Migration 0010).
 */

const PAGE_SIZE = 1000

interface StoredExerciseRow {
  block: string
  exercise: { slug: string } | null
  session: { id: string; started_at: string } | null
  session_sets: {
    set_type: string
    completed: boolean
    completed_at: string | null
    reps: number | null
    weight_kg: number | null
    distance_m: number | null
    duration_sec: number | null
  }[]
}

const orUndefined = <T>(value: T | null): T | undefined => (value === null ? undefined : value)

/** Alle gespeicherten Sätze der Übungen `slugs` aus allen Trainings (seitenweise). */
export async function fetchStoredSessions(
  supabase: AppSupabaseClient,
  slugs: readonly string[],
): Promise<StoredSession[]> {
  if (slugs.length === 0) return []
  const rows: StoredExerciseRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('session_exercises')
      .select(
        `block,
         exercise:exercises!session_exercises_exercise_id_fkey!inner ( slug ),
         session:workout_sessions!inner ( id, started_at ),
         session_sets ( set_type, completed, completed_at, reps, weight_kg, distance_m, duration_sec )`,
      )
      .in('exercise.slug', [...slugs])
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const page = data as unknown as StoredExerciseRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  const sessions = new Map<string, StoredSession>()
  for (const row of rows) {
    if (!row.session || !row.exercise) continue
    const session = sessions.get(row.session.id) ?? {
      sessionId: row.session.id,
      startedAt: row.session.started_at,
      exercises: [],
    }
    session.exercises.push({
      exerciseSlug: row.exercise.slug,
      block: row.block as BlockType,
      sets: row.session_sets.map((s) => ({
        setType: s.set_type as SetType,
        completed: s.completed,
        completedAt: orUndefined(s.completed_at),
        reps: orUndefined(s.reps),
        weightKg: orUndefined(s.weight_kg),
        distanceM: orUndefined(s.distance_m),
        durationSec: orUndefined(s.duration_sec),
      })),
    })
    sessions.set(session.sessionId, session)
  }
  return [...sessions.values()]
}

/** Berechnet die Bestleistungen der Übungen `slugs` aus allen Trainings neu. */
export async function recomputeRecords(
  supabase: AppSupabaseClient,
  slugs: readonly string[],
  measurementOf: (slug: string) => Measurement | undefined,
): Promise<void> {
  if (slugs.length === 0) return
  const sessions = await fetchStoredSessions(supabase, slugs)
  const records = bestRecordsAcross(sessions, slugs, measurementOf).map((r) => ({
    exercise_slug: r.exerciseSlug,
    record_type: r.recordType,
    context: r.context,
    context_key: r.contextKey,
    value: r.value,
    unit: r.unit,
    achieved_at: r.achievedAt,
    session_id: r.sessionId,
  }))
  if (records.length === 0) return
  const { error } = await supabase.rpc('offer_records', { p: records as unknown as Json })
  if (error) throw error
}

function toSlugs(data: unknown): string[] {
  return Array.isArray(data) ? data.filter((s): s is string => typeof s === 'string') : []
}

/**
 * Speichert einen Eintrag. Beim Bearbeiten werden zuerst die Bestleistungen dieses
 * Trainings freigegeben und danach aus allen Trainings neu berechnet – so bleibt nach
 * einer Korrektur kein zu hoher Wert stehen.
 */
export async function saveManualEntry(
  supabase: AppSupabaseClient,
  entry: ManualEntry,
  options: { editing: boolean; measurementOf: (slug: string) => Measurement | undefined },
): Promise<SaveSessionResult> {
  let released: string[] = []
  if (options.editing) {
    const { data, error } = await supabase.rpc('release_session_records', {
      p_session_id: entry.id,
    })
    if (error) throw error
    released = toSlugs(data)
  }
  const { data, error } = await supabase.rpc('save_workout_session', {
    p: toEntryPayload(entry) as unknown as Json,
  })
  if (error) throw error
  await recomputeRecords(supabase, released, options.measurementOf)
  return data as unknown as SaveSessionResult
}

/** Löscht ein nachgetragenes Training bzw. eine Trainer-Session und berechnet Rekorde neu. */
export async function deleteManualSession(
  supabase: AppSupabaseClient,
  sessionId: string,
  measurementOf: (slug: string) => Measurement | undefined,
): Promise<void> {
  const { data, error } = await supabase.rpc('delete_logged_session', {
    p_session_id: sessionId,
  })
  if (error) throw error
  await recomputeRecords(supabase, toSlugs(data), measurementOf)
}
