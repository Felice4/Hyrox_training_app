import {
  FOCUSES,
  INTENSITIES,
  RACE_SESSION_TYPES,
  generatedWorkoutSchema,
  type Focus,
  type GeneratedWorkout,
  type Intensity,
  type RaceSessionType,
} from '@/domain/generator'
import type { AppSupabaseClient } from '@/lib/supabase'
import type { Json, Tables } from '@/types/database'

export type PlannedStatus = 'planned' | 'completed' | 'skipped'

/** Eine geplante Einheit (aus dem Wochenplan, spontan hinzugefügt oder Trainer-Termin). */
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
  source: 'week_plan' | 'manual' | 'trainer'
  /** Trainer-Termin: Titel (z. B. „HYROX Class"), Trainer/Studio, Uhrzeit „HH:MM" */
  title: string | null
  coach: string | null
  startTime: string | null
  completedSessionId: string | null
  /** Einheit des Wettkampfplans (docs/RACE_PREP.md §3), sonst `null` */
  raceSessionType: RaceSessionType | null
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
    source: row.source === 'manual' || row.source === 'trainer' ? row.source : 'week_plan',
    title: row.title,
    coach: row.coach,
    // Postgres liefert „18:00:00"
    startTime: row.start_time ? row.start_time.slice(0, 5) : null,
    completedSessionId: row.completed_session_id,
    raceSessionType: RACE_SESSION_TYPES.includes(row.race_session_type as RaceSessionType)
      ? (row.race_session_type as RaceSessionType)
      : null,
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
    race_session_type?: RaceSessionType | undefined
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
  /** Nur Trainer-Termine */
  title?: string
  coach?: string | null
  startTime?: string
  /** `null`, wenn eine Wettkampf-Einheit durch ein anderes Workout ersetzt wird */
  raceSessionType?: RaceSessionType | null
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
      title: change.title,
      coach: change.coach,
      start_time: change.startTime,
      race_session_type: change.raceSessionType,
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

export interface TrainerAppointmentInput {
  date: string
  /** „HH:MM" */
  startTime: string
  title: string
  coach: string | null
  focus: Focus
  intensity: Intensity
  durationMin: number
}

/**
 * Trainer-Termin im Voraus eintragen (docs/MANUAL_ENTRY.md §3). Ohne erzeugtes Workout;
 * gehört zu keinem Wochenplan und bleibt daher bei einer Neuplanung bestehen.
 */
export async function addTrainerAppointment(
  supabase: AppSupabaseClient,
  input: TrainerAppointmentInput,
): Promise<string> {
  const { data, error } = await supabase
    .from('planned_workouts')
    .insert({
      scheduled_date: input.date,
      start_time: input.startTime,
      title: input.title,
      coach: input.coach,
      focus: input.focus,
      intensity: input.intensity,
      target_duration_min: input.durationMin,
      workout: null,
      source: 'trainer',
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}
