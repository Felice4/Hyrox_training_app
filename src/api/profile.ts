import type { SaveProfilePayload } from '@/domain/profile/payload'
import type { AppSupabaseClient } from '@/lib/supabase'
import type { Json, Tables } from '@/types/database'

export type ProfileRow = Tables<'profiles'>

/** Profil des angemeldeten Nutzers oder `null`, wenn es noch keines gibt. */
export async function fetchProfile(supabase: AppSupabaseClient): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle()
  if (error) throw error
  return data
}

export interface SaveProfileResult {
  status: 'saved'
  first_completion: boolean
  records_saved: number
  records_removed: number
  records_skipped: number
}

/** Speichert alle Profilangaben in einer Transaktion (Datenbankfunktion save_profile). */
export async function saveProfile(
  supabase: AppSupabaseClient,
  payload: SaveProfilePayload,
): Promise<SaveProfileResult> {
  const { data, error } = await supabase.rpc('save_profile', { p: payload as unknown as Json })
  if (error) throw error
  return data as unknown as SaveProfileResult
}
