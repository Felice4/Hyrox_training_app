import { EXERCISE_LIBRARY, LIBRARY_VERSION, type ExerciseDefinition } from '@/data/exercises'
import type { AppSupabaseClient } from '@/lib/supabase'
import type { Json } from '@/types/database'

/** Eine Bibliotheksübung im Format der Datenbankfunktion sync_exercise_library (snake_case). */
export interface LibraryExerciseRow {
  slug: string
  name: string
  description: string
  category: string
  training_types: string[]
  movement_pattern: string
  primary_muscles: string[]
  secondary_muscles: string[]
  equipment: string[]
  difficulty: number
  measurement: string
  load_params: Record<string, [number, number]>
  instructions: string[]
  alternative_slugs: string[]
  hyrox_station: string | null
  stress_regions: string[]
}

export function toLibraryRow(exercise: ExerciseDefinition): LibraryExerciseRow {
  // Nur gesetzte Belastungsfelder übernehmen (undefined gehört nicht ins JSON)
  const loadParams: Record<string, [number, number]> = {}
  for (const [key, range] of Object.entries(exercise.loadParams)) {
    if (range) loadParams[key] = [range[0], range[1]]
  }
  return {
    slug: exercise.slug,
    name: exercise.name,
    description: exercise.description,
    category: exercise.category,
    training_types: [...exercise.trainingTypes],
    movement_pattern: exercise.movementPattern,
    primary_muscles: [...exercise.primaryMuscles],
    secondary_muscles: [...exercise.secondaryMuscles],
    equipment: [...exercise.equipment],
    difficulty: exercise.difficulty,
    measurement: exercise.measurement,
    load_params: loadParams,
    instructions: [...exercise.instructions],
    alternative_slugs: [...exercise.alternatives],
    hyrox_station: exercise.hyroxStation ?? null,
    stress_regions: [...exercise.stressRegions],
  }
}

export type LibrarySyncResult =
  | { status: 'up_to_date'; version: number }
  | { status: 'synced'; version: number; inserted: number; updated: number; archived: number }

/** Höchste in der Datenbank abgeglichene Bibliotheksversion (0 = noch nie abgeglichen). */
async function fetchSyncedLibraryVersion(supabase: AppSupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from('exercises')
    .select('library_version')
    .eq('source', 'library')
    .not('library_version', 'is', null)
    .order('library_version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.library_version ?? 0
}

/**
 * Gleicht die Übungsbibliothek aus dem Code mit der Datenbank ab – aber nur, wenn die
 * Datenbank einen älteren Stand hat. So wird die große Übungsliste nicht bei jedem
 * Start übertragen.
 */
export async function syncExerciseLibrary(supabase: AppSupabaseClient): Promise<LibrarySyncResult> {
  const syncedVersion = await fetchSyncedLibraryVersion(supabase)
  if (syncedVersion >= LIBRARY_VERSION) {
    return { status: 'up_to_date', version: syncedVersion }
  }

  const rows = EXERCISE_LIBRARY.map(toLibraryRow)
  const { data, error } = await supabase.rpc('sync_exercise_library', {
    p_version: LIBRARY_VERSION,
    p_exercises: rows as unknown as Json,
  })
  if (error) throw error
  return data as unknown as LibrarySyncResult
}
