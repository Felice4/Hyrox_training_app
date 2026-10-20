import { exerciseDefinitionSchema, type ExerciseDefinition } from '@/data/exercises/schema'
import { PREFERENCES, type Preference } from '@/data/exercises/vocabulary'
import type { AppSupabaseClient } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type ExerciseRow = Tables<'exercises'>

/** Übung aus der Datenbank: Bibliotheks- oder eigene Übung inkl. persönlicher Einstellungen. */
export interface CatalogExercise extends ExerciseDefinition {
  id: string
  source: 'library' | 'custom'
  preference: Preference
  isArchived: boolean
}

function isPreference(value: string): value is Preference {
  return (PREFERENCES as readonly string[]).includes(value)
}

/**
 * Wandelt eine Datenbankzeile in eine geprüfte Übung um.
 * Liefert `null`, wenn die Zeile nicht zum Schema passt (z. B. unbekannter Wert).
 */
export function fromExerciseRow(row: ExerciseRow): CatalogExercise | null {
  const parsed = exerciseDefinitionSchema.safeParse({
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    trainingTypes: row.training_types,
    movementPattern: row.movement_pattern,
    primaryMuscles: row.primary_muscles,
    secondaryMuscles: row.secondary_muscles,
    equipment: row.equipment,
    difficulty: row.difficulty,
    measurement: row.measurement,
    loadParams: row.load_params,
    instructions: row.instructions,
    alternatives: row.alternative_slugs,
    hyroxStation: row.hyrox_station ?? undefined,
    stressRegions: row.stress_regions,
  })
  if (!parsed.success || (row.source !== 'library' && row.source !== 'custom')) {
    return null
  }
  return {
    ...parsed.data,
    id: row.id,
    source: row.source,
    preference: isPreference(row.preference) ? row.preference : 'neutral',
    isArchived: row.is_archived,
  }
}

export interface ExerciseCatalog {
  exercises: CatalogExercise[]
  /** Zeilen, die nicht gelesen werden konnten (sollte 0 sein). */
  invalidCount: number
}

/** Lädt alle nicht archivierten Übungen des angemeldeten Nutzers, alphabetisch sortiert. */
export async function fetchExerciseCatalog(supabase: AppSupabaseClient): Promise<ExerciseCatalog> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_archived', false)
    .order('name')
  if (error) throw error

  const exercises: CatalogExercise[] = []
  let invalidCount = 0
  for (const row of data) {
    const exercise = fromExerciseRow(row)
    if (exercise) exercises.push(exercise)
    else invalidCount += 1
  }
  if (invalidCount > 0) {
    console.warn(`${invalidCount} Übung(en) aus der Datenbank passen nicht zum Schema.`)
  }
  exercises.sort((a, b) => a.name.localeCompare(b.name, 'de'))
  return { exercises, invalidCount }
}
