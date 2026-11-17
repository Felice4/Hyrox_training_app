import type { ExerciseDefinition } from '@/data/exercises/schema'
import type { CombatSport, Difficulty, MuscleGroup } from '@/data/exercises/vocabulary'

/**
 * Kampfsport-Bibliothek (docs/COMBAT.md): Drills sind Übungen der Kategorie „combat",
 * die zu einer oder mehreren Kampfsportarten gehören.
 */

type Drill = Pick<
  ExerciseDefinition,
  'name' | 'category' | 'combatSports' | 'giMode' | 'difficulty'
>

/** Filter für BJJ: alle, nur Gi oder nur NoGi. Drills für beides passen immer. */
export type GiFilter = 'all' | 'gi' | 'nogi'

export function isCombatDrill(exercise: Pick<ExerciseDefinition, 'category'>): boolean {
  return exercise.category === 'combat'
}

export function matchesGi(drill: Pick<Drill, 'giMode'>, filter: GiFilter): boolean {
  if (filter === 'all' || drill.giMode === undefined || drill.giMode === 'both') return true
  return drill.giMode === filter
}

/** Drills einer Sportart (optional nach Stufe und Gi/NoGi gefiltert), alphabetisch. */
export function drillsForSport<T extends Drill>(
  exercises: readonly T[],
  sport: CombatSport,
  filter: { level?: Difficulty | 'all'; gi?: GiFilter } = {},
): T[] {
  const level = filter.level ?? 'all'
  return exercises
    .filter(
      (e) =>
        isCombatDrill(e) &&
        e.combatSports.includes(sport) &&
        (level === 'all' || e.difficulty === level) &&
        (sport !== 'bjj' || matchesGi(e, filter.gi ?? 'all')),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

/** Gruppen nach Stufe (Grundlagen → Advanced); leere Stufen fallen weg. */
export function groupByLevel<T extends Drill>(
  drills: readonly T[],
): { level: Difficulty; drills: T[] }[] {
  return ([1, 2, 3] as const)
    .map((level) => ({ level, drills: drills.filter((d) => d.difficulty === level) }))
    .filter((group) => group.drills.length > 0)
}

/**
 * Hauptmuskeln eigener Drills, abgeleitet aus der ersten Sportart – damit eigene Drills
 * ohne Muskelauswahl angelegt werden können und trotzdem in der Muskelbelastung zählen.
 */
export const SPORT_DEFAULT_MUSCLES: Record<CombatSport, MuscleGroup[]> = {
  bjj: ['abs', 'forearms'],
  boxing: ['front_delts', 'obliques'],
  kickboxing: ['glutes', 'obliques'],
  taekwondo: ['hip_flexors', 'glutes'],
  mma: ['abs', 'front_delts'],
  wrestling: ['quadriceps', 'upper_back'],
  judo: ['forearms', 'lats'],
}
