import type { CatalogExercise } from '@/api/exercises'

/** Bereiche für Übungsauswahl und Bestleistungen. */
export type Group = 'Kraft' | 'HYROX-Stationen' | 'Ausdauer & Ergometer' | 'Weitere'
export const GROUPS: readonly Group[] = [
  'Kraft',
  'HYROX-Stationen',
  'Ausdauer & Ergometer',
  'Weitere',
]

export function groupOf(exercise: CatalogExercise): Group {
  if (exercise.hyroxStation) return 'HYROX-Stationen'
  if (exercise.category === 'strength') return 'Kraft'
  if (exercise.category === 'endurance') return 'Ausdauer & Ergometer'
  return 'Weitere'
}
