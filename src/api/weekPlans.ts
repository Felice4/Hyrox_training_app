import {
  FOCUSES,
  INTENSITIES,
  generatedWorkoutSchema,
  type Focus,
  type GeneratedWorkout,
  type Intensity,
} from '@/domain/generator'
import type { AppSupabaseClient } from '@/lib/supabase'
import type { Json, Tables } from '@/types/database'

export type PlannedStatus = 'planned' | 'completed' | 'skipped'

/** Eine geplante Einheit (aus dem Wochenplan oder spontan hinzugefügt). */
export interface PlannedWorkout {
  id: string
  weekPlanId: string | null
  /** Lokales Datum „JJJJ-MM-TT" */
  date: string
  /** Ursprüngliches Datum, falls verschoben */
  originalDate: string | null
  status: PlannedStatus
  focus: Focus
  intensity: Intensity
  durationMin: number
  /** `null`, wenn kein (gültiges) Workout gespeichert ist – dann neu erzeugen */
  workout: GeneratedWorkout | null
  source: 'week_plan' | 'manual'
  completedSessionId: string | null
}

export interface WeekPlan {
  id: string
  weekStart: string
  notes: string | null
}

const STATUSES: readonly PlannedStatus[] = ['planned', 'completed', 'skipped']

/** Datenbankzeile → geprüfte Einheit; unbekannte Werte werden auf sichere Standards gesetzt. */
export function toPlannedWorkout(row: Tables<'planned_workouts'>): PlannedWorkout {
  const parsed = row.workout === null ? null : generatedWorkoutSchema.safeParse(row.workout)
  return {
    id: row.id,
    weekPlanId: row.week_plan_id,
    date: row.scheduled_date,
    originalDate: row.original_date,
    status: STATUSES.includes(row.status as PlannedStatus)
      ? (row.status as PlannedStatus)
      : 'planned',
    focus: FOCUSES.includes(row.focus as Focus) ? (row.focus as Focus) : 'mixed',
    intensity: INTENSITIES.includes(row.intensity as Intensity)
      ? (row.intensity as Intensity)
      : 'moderate',
    durationMin: row.target_duration_min,
    workout: parsed?.success ? parsed.data : null,
    source: row.source === 'manual' ? 'manual' : 'week_plan',
    completedSessionId: row.completed_session_id,
  }
}

/** Geplante Einheiten im Zeitraum `from`–`to` (lokale Daten, inklusive). */
export async function fetchPlannedWorkouts(
  supabase: AppSupabaseClient,
  from: string,
  to: string,
): Promise<PlannedWorkout[]> {
  const { data, error } = await supabase
    .from('planned_workouts')
    .select('*')
    .gte('scheduled_date', from)
    .lte('scheduled_date', to)
    .order('scheduled_date')
    .order('created_at')
  if (error) throw error
  return data.map(toPlannedWorkout)
}

export async function fetchPlannedWorkout(
  supabase: AppSupabaseClient,
  id: string,
): Promise<PlannedWorkout | null> {
  const { data, error } = await supabase
    .from('planned_workouts')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? toPlannedWorkout(data) : null
}

export async function fetchWeekPlan(
  supabase: AppSupabaseClient,
  weekStart: string,
): Promise<WeekPlan | null> {
  const { data, error } = await supabase
    .from('week_plans')
    .select('id, week_start, notes')
    .eq('week_start', weekStart)
    .maybeSingle()
  if (error) throw error
  return data ? { id: data.id, weekStart: data.week_start, notes: data.notes } : null
}

/** Nutzlast für die Datenbankfunktion replace_week_plan (Migration 0005). */
export interface ReplaceWeekPlanPayload {
  week_start: string
  today: string
  generator_version: string
  notes: string | null
  workouts: {
    scheduled_date: string
    focus: Focus
    target_duration_min: number
    intensity: Intensity
    workout: GeneratedWorkout
    explanation: string[]
  }[]
}

export interface ReplaceWeekPlanResult {
  status: 'saved'
  week_plan_id: string
  removed: number
  inserted: number
}

/** Legt den Wochenplan an bzw. ersetzt nur dessen offene Einheiten ab heute. */
export async function replaceWeekPlan(
  supabase: AppSupabaseClient,
  payload: ReplaceWeekPlanPayload,
): Promise<ReplaceWeekPlanResult> {
  const { data, error } = await supabase.rpc('replace_week_plan', {
    p: payload as unknown as Json,
  })
  if (error) throw error
  return data as unknown as ReplaceWeekPlanResult
}

/** Änderbare Felder einer geplanten Einheit. */
export interface PlannedWorkoutChange {
  date?: string
  originalDate?: string | null
  status?: 'planned' | 'skipped'
  focus?: Focus
  intensity?: Intensity
  durationMin?: number
  workout?: GeneratedWorkout
}

export async function updatePlannedWorkout(
  supabase: AppSupabaseClient,
  id: string,
  change: PlannedWorkoutChange,
): Promise<void> {
  const { error } = await supabase
    .from('planned_workouts')
    .update({
      scheduled_date: change.date,
      original_date: change.originalDate,
      status: change.status,
      focus: change.focus,
      intensity: change.intensity,
      target_duration_min: change.durationMin,
      workout: change.workout as unknown as Json | undefined,
    })
    .eq('id', id)
    // Erledigte Einheiten sind Teil der Historie und bleiben unverändert
    .neq('status', 'completed')
  if (error) throw error
}

/**
 * Fügt eine spontane Einheit hinzu. Sie gehört zu keinem Wochenplan und bleibt daher
 * auch bei einer Neuplanung der Woche bestehen.
 */
export async function addPlannedWorkout(
  supabase: AppSupabaseClient,
  date: string,
  workout: GeneratedWorkout,
): Promise<string> {
  const { data, error } = await supabase
    .from('planned_workouts')
    .insert({
      scheduled_date: date,
      focus: workout.focus,
      intensity: workout.intensity,
      target_duration_min: workout.targetDurationMin,
      workout: workout as unknown as Json,
      source: 'manual',
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function deletePlannedWorkout(supabase: AppSupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('planned_workouts').delete().eq('id', id)
  if (error) throw error
}
