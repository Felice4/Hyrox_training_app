import type { ExerciseDefinition } from '@/data/exercises/schema'
import {
  COMBAT_SPORTS,
  type CombatSport,
  type Difficulty,
  type MovementGroup,
} from '@/data/exercises/vocabulary'

/**
 * Movement Lab (docs/MOVEMENT.md): Übungen der Kategorie „movement", aufgeteilt in
 * Gruppen (Mobilität, Bodenbewegungen …), optional mit Herkunft (z. B. Wrestling).
 */

type MovementExercise = Pick<
  ExerciseDefinition,
  'name' | 'category' | 'movementGroups' | 'combatSports' | 'difficulty'
>

export function isMovementExercise(exercise: Pick<ExerciseDefinition, 'category'>): boolean {
  return exercise.category === 'movement'
}

export interface MovementFilter {
  level?: Difficulty | 'all'
  origin?: CombatSport | 'all'
}

/** Übungen einer Gruppe (optional nach Stufe und Herkunft gefiltert), alphabetisch. */
export function exercisesInGroup<T extends MovementExercise>(
  exercises: readonly T[],
  group: MovementGroup,
  filter: MovementFilter = {},
): T[] {
  const level = filter.level ?? 'all'
  const origin = filter.origin ?? 'all'
  return exercises
    .filter(
      (e) =>
        isMovementExercise(e) &&
        e.movementGroups.includes(group) &&
        (level === 'all' || e.difficulty === level) &&
        (origin === 'all' || e.combatSports.includes(origin)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

/** Herkünfte, die in den Übungen vorkommen – in fester Reihenfolge (für Filter-Chips). */
export function originsOf(exercises: readonly Pick<MovementExercise, 'combatSports'>[]) {
  const used = new Set(exercises.flatMap((e) => e.combatSports))
  return COMBAT_SPORTS.filter((sport) => used.has(sport))
}

const normalize = (text: string) =>
  text
    .toLocaleLowerCase('de')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

/** Suche über Name und Beschreibung: alle Wörter müssen vorkommen (ohne Akzente/Groß-Klein). */
export function matchesSearch(
  exercise: Pick<ExerciseDefinition, 'name' | 'description'>,
  query: string,
): boolean {
  const text = normalize(`${exercise.name} ${exercise.description}`)
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word))
}
