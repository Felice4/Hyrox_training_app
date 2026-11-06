import type { AppSupabaseClient } from '@/lib/supabase'
import type { Tables } from '@/types/database'

type SessionSetRow = Tables<'session_sets'>
type SessionExerciseRow = Tables<'session_exercises'> & {
  exercise: { slug: string } | null
  session_sets: SessionSetRow[]
}
export type ExportSession = Tables<'workout_sessions'> & { session_exercises: SessionExerciseRow[] }
export type ExportRecord = Tables<'personal_records'> & {
  exercise: { slug: string; name: string } | null
}

/** Alle eigenen Daten (RLS liefert nur die des angemeldeten Nutzers). */
export interface ExportData {
  format: 'hyrox-coach-export'
  version: 1
  exportedAt: string
  profile: Tables<'profiles'> | null
  goals: Tables<'training_goals'> | null
  sessions: ExportSession[]
  records: ExportRecord[]
  bodyMeasurements: Tables<'body_measurements'>[]
  readinessCheckins: Tables<'readiness_checkins'>[]
  weekPlans: Tables<'week_plans'>[]
  plannedWorkouts: Tables<'planned_workouts'>[]
  /** Eigene Übungen vollständig (Bibliotheksübungen stehen im Code der App) */
  customExercises: Tables<'exercises'>[]
  /** Persönliche Einstellungen zu Bibliotheksübungen */
  exercisePreferences: { slug: string; preference: string }[]
  /** Skill-Ziele mit Status und Stufenverlauf (Inhalte der Skills stehen im Code) */
  skillGoals: Tables<'skill_goals'>[]
  skillStageLog: Tables<'skill_stage_log'>[]
  /** Eigene Meilensteine und Änderungen an Standard-Meilensteinen */
  userMilestones: Tables<'user_milestones'>[]
  /** HYROX-Simulationen mit Format, Division und Zwischenzeiten */
  hyroxSimulations: Tables<'hyrox_simulations'>[]
}

/** Supabase liefert höchstens 1000 Zeilen je Abfrage – darum seitenweise laden. */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  size = 1000,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < size) return rows
  }
}

export async function fetchExportData(supabase: AppSupabaseClient): Promise<ExportData> {
  const [profile, goals] = await Promise.all([
    supabase.from('profiles').select('*').maybeSingle(),
    supabase.from('training_goals').select('*').maybeSingle(),
  ])
  if (profile.error) throw profile.error
  if (goals.error) throw goals.error

  const [
    sessions,
    records,
    bodyMeasurements,
    readinessCheckins,
    weekPlans,
    plannedWorkouts,
    exercises,
    skillGoals,
    skillStageLog,
    userMilestones,
    hyroxSimulations,
  ] = await Promise.all([
    // Trainings mit Übungen und Sätzen – kleinere Seiten, weil jede Zeile verschachtelt ist
    fetchAll(
      (from, to) =>
        supabase
          .from('workout_sessions')
          .select(
            `*, session_exercises ( *,
               exercise:exercises!session_exercises_exercise_id_fkey ( slug ),
               session_sets ( * ) )`,
          )
          .order('started_at')
          .range(from, to) as unknown as PromiseLike<{
          data: ExportSession[] | null
          error: unknown
        }>,
      200,
    ),
    fetchAll(
      (from, to) =>
        supabase
          .from('personal_records')
          .select('*, exercise:exercises ( slug, name )')
          .order('achieved_at')
          .range(from, to) as unknown as PromiseLike<{
          data: ExportRecord[] | null
          error: unknown
        }>,
    ),
    fetchAll((from, to) =>
      supabase.from('body_measurements').select('*').order('measured_on').range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from('readiness_checkins').select('*').order('checked_at').range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from('week_plans').select('*').order('week_start').range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from('planned_workouts').select('*').order('scheduled_date').range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from('exercises')
        .select('*')
        .or('source.eq.custom,preference.neq.neutral')
        .order('slug')
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from('skill_goals').select('*').order('skill_slug').range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from('skill_stage_log').select('*').order('achieved_at').range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from('user_milestones').select('*').order('created_at').range(from, to),
    ),
    fetchAll((from, to) =>
      supabase.from('hyrox_simulations').select('*').order('started_at').range(from, to),
    ),
  ])

  return {
    format: 'hyrox-coach-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: profile.data,
    goals: goals.data,
    sessions,
    records,
    bodyMeasurements,
    readinessCheckins,
    weekPlans,
    plannedWorkouts,
    customExercises: exercises.filter((e) => e.source === 'custom'),
    exercisePreferences: exercises
      .filter((e) => e.source === 'library' && e.preference !== 'neutral')
      .map((e) => ({ slug: e.slug, preference: e.preference })),
    skillGoals,
    skillStageLog,
    userMilestones,
    hyroxSimulations,
  }
}
