import {
  BLOCK_TYPES,
  FOCUSES,
  INTENSITIES,
  type BlockType,
  type Focus,
  type Intensity,
  type SetType,
} from '@/domain/generator/types'
import type { SetValues } from '@/domain/session/types'
import type { AppSupabaseClient } from '@/lib/supabase'

const pick = <T extends string>(values: readonly T[], value: string, fallback: T): T =>
  (values as readonly string[]).includes(value) ? (value as T) : fallback
const orUndefined = <T>(value: T | null): T | undefined => (value === null ? undefined : value)
const num = (value: number | string | null) => (value === null ? undefined : Number(value))

/** Ein Training in der Liste. */
export interface SessionListItem {
  id: string
  startedAt: string
  focus: Focus
  intensity: Intensity
  status: 'completed' | 'partial'
  durationMin: number
  rpe: number | undefined
  notes: string | null
  exerciseCount: number
}

interface ListRow {
  id: string
  started_at: string
  focus: string
  intensity: string
  status: string
  active_duration_sec: number
  session_rpe: number | null
  notes: string | null
  session_exercises: { count: number }[]
}

export function toListItem(row: ListRow): SessionListItem {
  return {
    id: row.id,
    startedAt: row.started_at,
    focus: pick(FOCUSES, row.focus, 'mixed'),
    intensity: pick(INTENSITIES, row.intensity, 'moderate'),
    status: row.status === 'partial' ? 'partial' : 'completed',
    durationMin: Math.round(row.active_duration_sec / 60),
    rpe: orUndefined(row.session_rpe),
    notes: row.notes,
    exerciseCount: row.session_exercises[0]?.count ?? 0,
  }
}

export const SESSION_PAGE_SIZE = 20

/** Trainings, neueste zuerst; `before` = Beginn des ältesten bereits geladenen Trainings. */
export async function fetchSessionList(
  supabase: AppSupabaseClient,
  before?: string,
): Promise<SessionListItem[]> {
  let query = supabase
    .from('workout_sessions')
    .select(
      'id, started_at, focus, intensity, status, active_duration_sec, session_rpe, notes, session_exercises(count)',
    )
  if (before) query = query.lt('started_at', before)
  const { data, error } = await query
    .order('started_at', { ascending: false })
    .limit(SESSION_PAGE_SIZE)
  if (error) throw error
  return (data as unknown as ListRow[]).map(toListItem)
}

export interface SessionSetDetail {
  setNumber: number
  type: SetType
  target: SetValues
  actual: SetValues
  rpe: number | undefined
  completed: boolean
}

export interface SessionExerciseDetail {
  id: string
  slug: string | undefined
  name: string
  block: BlockType
  status: 'completed' | 'partial' | 'skipped'
  /** Ursprünglich geplante Übung, falls im Training getauscht */
  replacedName: string | undefined
  sets: SessionSetDetail[]
}

export interface SessionRecord {
  exerciseSlug: string
  recordType: string
  contextKey: string
  value: number
}

export interface SessionDetail extends SessionListItem {
  endedAt: string
  trainingLoad: number
  exercises: SessionExerciseDetail[]
  /** Bestleistungen, die (noch) aus diesem Training stammen */
  records: SessionRecord[]
}

interface SetRow {
  set_number: number
  set_type: string
  target_reps: number | null
  target_weight_kg: number | string | null
  target_distance_m: number | string | null
  target_duration_sec: number | null
  target_calories: number | null
  reps: number | null
  weight_kg: number | string | null
  distance_m: number | string | null
  duration_sec: number | null
  calories: number | null
  rpe: number | string | null
  completed: boolean
}

interface DetailRow extends Omit<ListRow, 'session_exercises'> {
  ended_at: string
  training_load: number
  session_exercises: {
    id: string
    position: number
    exercise_name: string
    block: string
    status: string
    exercise: { slug: string } | null
    replaced: { name: string } | null
    session_sets: SetRow[]
  }[]
}

const SET_TYPES: readonly SetType[] = ['warmup', 'working', 'interval', 'round']
const EXERCISE_STATUSES = ['completed', 'partial', 'skipped'] as const

export function toSessionDetail(row: DetailRow, records: SessionRecord[]): SessionDetail {
  const exercises = [...row.session_exercises].sort((a, b) => a.position - b.position)
  return {
    ...toListItem({ ...row, session_exercises: [{ count: exercises.length }] }),
    endedAt: row.ended_at,
    trainingLoad: row.training_load,
    records,
    exercises: exercises.map((e) => ({
      id: e.id,
      slug: e.exercise?.slug,
      name: e.exercise_name,
      block: pick(BLOCK_TYPES, e.block, 'main'),
      status: pick(EXERCISE_STATUSES, e.status, 'completed'),
      replacedName: e.replaced?.name,
      sets: [...e.session_sets]
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({
          setNumber: s.set_number,
          type: pick(SET_TYPES, s.set_type, 'working'),
          target: {
            reps: orUndefined(s.target_reps),
            weightKg: num(s.target_weight_kg),
            distanceM: num(s.target_distance_m),
            durationSec: orUndefined(s.target_duration_sec),
            calories: orUndefined(s.target_calories),
          },
          actual: {
            reps: orUndefined(s.reps),
            weightKg: num(s.weight_kg),
            distanceM: num(s.distance_m),
            durationSec: orUndefined(s.duration_sec),
            calories: orUndefined(s.calories),
          },
          rpe: num(s.rpe),
          completed: s.completed,
        })),
    })),
  }
}

/** Ein Training vollständig: Übungen, Sätze (Vorgabe und Ist) und Bestleistungen. */
export async function fetchSessionDetail(
  supabase: AppSupabaseClient,
  id: string,
): Promise<SessionDetail | null> {
  const [session, records] = await Promise.all([
    supabase
      .from('workout_sessions')
      .select(
        `id, started_at, ended_at, focus, intensity, status, active_duration_sec, session_rpe, notes, training_load,
         session_exercises (
           id, position, exercise_name, block, status,
           exercise:exercises!session_exercises_exercise_id_fkey ( slug ),
           replaced:exercises!session_exercises_replaced_exercise_id_fkey ( name ),
           session_sets ( set_number, set_type, target_reps, target_weight_kg, target_distance_m, target_duration_sec, target_calories,
                          reps, weight_kg, distance_m, duration_sec, calories, rpe, completed )
         )`,
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('personal_records')
      .select('record_type, context_key, value, exercise:exercises(slug)')
      .eq('session_id', id),
  ])
  if (session.error) throw session.error
  if (records.error) throw records.error
  if (!session.data) return null
  const sessionRecords = (
    records.data as unknown as {
      record_type: string
      context_key: string
      value: number | string
      exercise: { slug: string } | null
    }[]
  ).flatMap((r) =>
    r.exercise
      ? [
          {
            exerciseSlug: r.exercise.slug,
            recordType: r.record_type,
            contextKey: r.context_key,
            value: Number(r.value),
          },
        ]
      : [],
  )
  return toSessionDetail(session.data as unknown as DetailRow, sessionRecords)
}

/** Notiz eines Trainings nachträglich ändern (leer = keine Notiz). */
export async function updateSessionNotes(
  supabase: AppSupabaseClient,
  id: string,
  notes: string,
): Promise<void> {
  const trimmed = notes.trim()
  const { error } = await supabase
    .from('workout_sessions')
    .update({ notes: trimmed === '' ? null : trimmed })
    .eq('id', id)
  if (error) throw error
}
