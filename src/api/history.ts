import { FOCUSES, type Focus, type HistorySession, type SetType } from '@/domain/generator/types'
import type { AppSupabaseClient } from '@/lib/supabase'

const SET_TYPES: readonly SetType[] = ['warmup', 'working', 'interval', 'round']

/** Datenbankzeilen eines gespeicherten Trainings (Auswahl der benötigten Spalten). */
export interface HistoryRow {
  started_at: string
  focus: string
  active_duration_sec: number
  session_rpe: number | null
  session_exercises: {
    position: number
    exercise: { slug: string } | null
    session_sets: {
      set_number: number
      set_type: string
      completed: boolean
      reps: number | null
      weight_kg: number | null
      distance_m: number | null
      duration_sec: number | null
      rpe: number | null
      target_reps: number | null
    }[]
  }[]
}

const orUndefined = <T>(value: T | null): T | undefined => (value === null ? undefined : value)

/** Wandelt gespeicherte Trainings in den Verlauf für Generator und Progression um. */
export function toHistorySessions(rows: readonly HistoryRow[]): HistorySession[] {
  return rows.map((row) => ({
    startedAt: row.started_at,
    focus: (FOCUSES as readonly string[]).includes(row.focus) ? (row.focus as Focus) : 'mixed',
    durationMin: Math.round((row.active_duration_sec / 60) * 10) / 10,
    sessionRpe: orUndefined(row.session_rpe),
    exercises: [...row.session_exercises]
      .sort((a, b) => a.position - b.position)
      .flatMap((exercise) =>
        exercise.exercise
          ? [
              {
                exerciseSlug: exercise.exercise.slug,
                sets: [...exercise.session_sets]
                  .sort((a, b) => a.set_number - b.set_number)
                  .map((set) => ({
                    setType: (SET_TYPES as readonly string[]).includes(set.set_type)
                      ? (set.set_type as SetType)
                      : 'working',
                    completed: set.completed,
                    reps: orUndefined(set.reps),
                    weightKg: orUndefined(set.weight_kg),
                    distanceM: orUndefined(set.distance_m),
                    durationSec: orUndefined(set.duration_sec),
                    rpe: orUndefined(set.rpe),
                    targetReps: orUndefined(set.target_reps),
                  })),
              },
            ]
          : [],
      ),
  }))
}

/** Wie weit der Verlauf zurückreicht (Generator nutzt 28 Tage, „Letztes Mal" gern länger). */
export const HISTORY_DAYS = 90

const HISTORY_SELECT = `started_at, focus, active_duration_sec, session_rpe,
   session_exercises (
     position,
     exercise:exercises!session_exercises_exercise_id_fkey ( slug ),
     session_sets ( set_number, set_type, completed, reps, weight_kg, distance_m, duration_sec, rpe, target_reps )
   )`

/** Lädt die Trainings der letzten 90 Tage, neueste zuerst. */
export async function fetchTrainingHistory(
  supabase: AppSupabaseClient,
  now: Date = new Date(),
): Promise<HistorySession[]> {
  const since = new Date(now.getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString()
  return fetchSessionsBetween(supabase, since)
}

/** Trainings mit Beginn ab `from` (und vor `until`, ISO-Zeitpunkte), neueste zuerst. */
export async function fetchSessionsBetween(
  supabase: AppSupabaseClient,
  from: string,
  until?: string,
): Promise<HistorySession[]> {
  let query = supabase.from('workout_sessions').select(HISTORY_SELECT).gte('started_at', from)
  if (until) query = query.lt('started_at', until)
  const { data, error } = await query.order('started_at', { ascending: false })
  if (error) throw error
  return toHistorySessions(data as unknown as HistoryRow[])
}
