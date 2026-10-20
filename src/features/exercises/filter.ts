import type { ExerciseDefinition } from '@/data/exercises/schema'
import {
  CATEGORIES,
  EQUIPMENT,
  MUSCLE_GROUPS,
  type Category,
  type Equipment,
  type MuscleGroup,
} from '@/data/exercises/vocabulary'

export interface ExerciseFilter {
  query: string
  category: Category | 'all'
  muscle: MuscleGroup | 'all'
  /** 'none' = nur Übungen ohne Geräte */
  equipment: Equipment | 'all' | 'none'
}

export const EMPTY_FILTER: ExerciseFilter = {
  query: '',
  category: 'all',
  muscle: 'all',
  equipment: 'all',
}

/** Kleinschreibung und ohne Akzente/Umlaut-Punkte: „Übung" findet auch „ubung". */
export function normalizeSearch(text: string): string {
  return text
    .toLocaleLowerCase('de')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

type FilterableExercise = Pick<
  ExerciseDefinition,
  'name' | 'description' | 'category' | 'primaryMuscles' | 'equipment'
>

/** Filtert Übungen. Mehrere Suchwörter müssen alle vorkommen (in Name oder Beschreibung). */
export function filterExercises<T extends FilterableExercise>(
  exercises: readonly T[],
  filter: ExerciseFilter,
): T[] {
  const words = normalizeSearch(filter.query).split(/\s+/).filter(Boolean)

  return exercises.filter((exercise) => {
    if (filter.category !== 'all' && exercise.category !== filter.category) return false
    if (filter.muscle !== 'all' && !exercise.primaryMuscles.includes(filter.muscle)) return false
    if (filter.equipment === 'none' && exercise.equipment.length > 0) return false
    if (
      filter.equipment !== 'all' &&
      filter.equipment !== 'none' &&
      !exercise.equipment.includes(filter.equipment)
    ) {
      return false
    }
    if (words.length > 0) {
      const haystack = normalizeSearch(`${exercise.name} ${exercise.description}`)
      if (!words.every((word) => haystack.includes(word))) return false
    }
    return true
  })
}

export function isFilterActive(filter: ExerciseFilter): boolean {
  return (
    filter.query.trim() !== '' ||
    filter.category !== 'all' ||
    filter.muscle !== 'all' ||
    filter.equipment !== 'all'
  )
}

function oneOf<T extends string>(values: readonly T[], value: string | null): T | undefined {
  return value !== null && (values as readonly string[]).includes(value) ? (value as T) : undefined
}

/** Liest den Filter aus der Adresse (?q=…&kategorie=…), damit er beim Zurückgehen erhalten bleibt. */
export function parseExerciseFilter(params: URLSearchParams): ExerciseFilter {
  const equipment = params.get('geraet')
  return {
    query: params.get('q') ?? '',
    category: oneOf(CATEGORIES, params.get('kategorie')) ?? 'all',
    muscle: oneOf(MUSCLE_GROUPS, params.get('muskel')) ?? 'all',
    equipment: equipment === 'none' ? 'none' : (oneOf(EQUIPMENT, equipment) ?? 'all'),
  }
}

export function toSearchParams(filter: ExerciseFilter): URLSearchParams {
  const params = new URLSearchParams()
  if (filter.query) params.set('q', filter.query)
  if (filter.category !== 'all') params.set('kategorie', filter.category)
  if (filter.muscle !== 'all') params.set('muskel', filter.muscle)
  if (filter.equipment !== 'all') params.set('geraet', filter.equipment)
  return params
}
