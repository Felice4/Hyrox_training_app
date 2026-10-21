import type { SaveSessionPayload } from '@/domain/session/payload'
import type { AppSupabaseClient } from '@/lib/supabase'
import type { Json } from '@/types/database'

export interface SavedRecord {
  exercise_slug: string
  record_type: string
  context_key: string
  value: number
  unit: string
}

export interface SaveSessionResult {
  status: 'saved'
  session_id: string
  /** Bestleistungen, die durch dieses Training neu sind */
  new_records: SavedRecord[]
}

/** Speichert ein beendetes Training (idempotent – wiederholtes Speichern ist sicher). */
export async function saveWorkoutSession(
  supabase: AppSupabaseClient,
  payload: SaveSessionPayload,
): Promise<SaveSessionResult> {
  const { data, error } = await supabase.rpc('save_workout_session', {
    p: payload as unknown as Json,
  })
  if (error) throw error
  return data as unknown as SaveSessionResult
}
