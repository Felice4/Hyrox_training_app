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

export type GoalsRow = Tables<'training_goals'>

export interface LatestValue {
  value: number
  measuredOn: string
}

export interface StoredRecord {
  exerciseSlug: string
  recordType: string
  contextKey: string
  value: number
  source: 'manual' | 'session'
  achievedAt: string
}

/** Alles, was die Profilseite zum Bearbeiten braucht. */
export interface ProfileDetails {
  profile: ProfileRow | null
  goals: GoalsRow | null
  latestWeight: LatestValue | null
  latestBodyFat: LatestValue | null
  records: StoredRecord[]
  preferredExercises: string[]
  dislikedExercises: string[]
}

/** Lädt Profil, Ziele, letzte Körperwerte, Bestleistungen und Übungspräferenzen parallel. */
export async function fetchProfileDetails(supabase: AppSupabaseClient): Promise<ProfileDetails> {
  const [profile, goals, measurements, records, preferences] = await Promise.all([
    supabase.from('profiles').select('*').maybeSingle(),
    supabase.from('training_goals').select('*').maybeSingle(),
    supabase
      .from('body_measurements')
      .select('measured_on, weight_kg, body_fat_pct')
      .order('measured_on', { ascending: false })
      .limit(60),
    supabase
      .from('personal_records')
      .select('record_type, context_key, value, source, achieved_at, exercise:exercises(slug)'),
    supabase
      .from('exercises')
      .select('slug, preference')
      .in('preference', ['preferred', 'disliked'])
      .eq('is_archived', false),
  ])
  for (const result of [profile, goals, measurements, records, preferences]) {
    if (result.error) throw result.error
  }

  const rows = measurements.data ?? []
  const latest = (pick: (row: (typeof rows)[number]) => number | null): LatestValue | null => {
    const row = rows.find((r) => pick(r) !== null)
    return row ? { value: pick(row) as number, measuredOn: row.measured_on } : null
  }

  return {
    profile: profile.data,
    goals: goals.data,
    latestWeight: latest((r) => r.weight_kg),
    latestBodyFat: latest((r) => r.body_fat_pct),
    records: (records.data ?? []).flatMap((r) =>
      r.exercise && (r.source === 'manual' || r.source === 'session')
        ? [
            {
              exerciseSlug: r.exercise.slug,
              recordType: r.record_type,
              contextKey: r.context_key,
              value: r.value,
              source: r.source,
              achievedAt: r.achieved_at,
            },
          ]
        : [],
    ),
    preferredExercises: (preferences.data ?? [])
      .filter((e) => e.preference === 'preferred')
      .map((e) => e.slug),
    dislikedExercises: (preferences.data ?? [])
      .filter((e) => e.preference === 'disliked')
      .map((e) => e.slug),
  }
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
