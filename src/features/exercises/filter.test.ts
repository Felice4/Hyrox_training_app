import { describe, expect, it } from 'vitest'
import { EXERCISE_LIBRARY } from '@/data/exercises'
import {
  EMPTY_FILTER,
  filterExercises,
  isFilterActive,
  normalizeSearch,
  parseExerciseFilter,
  toSearchParams,
  type ExerciseFilter,
} from './filter'

const slugs = (filter: Partial<ExerciseFilter>) =>
  filterExercises(EXERCISE_LIBRARY, { ...EMPTY_FILTER, ...filter }).map((e) => e.slug)

describe('normalizeSearch', () => {
  it('ignoriert Groß-/Kleinschreibung und Umlaut-Punkte', () => {
    expect(normalizeSearch('  Übung ÄÖ ')).toBe('ubung ao')
  })
})

describe('filterExercises', () => {
  it('liefert ohne Filter alle Übungen', () => {
    expect(slugs({})).toHaveLength(EXERCISE_LIBRARY.length)
  })

  it('sucht im Namen, auch ohne Umlaute', () => {
    expect(slugs({ query: 'kniebeuge' })).toContain('back-squat')
    expect(slugs({ query: 'ruckenstrecken' })).toContain('back-extension')
  })

  it('verlangt bei mehreren Suchwörtern alle Wörter', () => {
    const result = slugs({ query: 'sled schwer' })
    expect(result).toEqual(expect.arrayContaining(['sled-push-heavy', 'sled-pull-heavy']))
    expect(result).not.toContain('hyrox-sled-push')
  })

  it('filtert nach Kategorie', () => {
    const result = filterExercises(EXERCISE_LIBRARY, { ...EMPTY_FILTER, category: 'hyrox' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((e) => e.category === 'hyrox')).toBe(true)
  })

  it('filtert nach primärer Muskelgruppe', () => {
    const result = filterExercises(EXERCISE_LIBRARY, { ...EMPTY_FILTER, muscle: 'chest' })
    expect(result.every((e) => e.primaryMuscles.includes('chest'))).toBe(true)
    expect(result.map((e) => e.slug)).toContain('bench-press')
  })

  it('filtert nach Gerät und nach „ohne Geräte"', () => {
    const sled = filterExercises(EXERCISE_LIBRARY, { ...EMPTY_FILTER, equipment: 'sled' })
    expect(sled.every((e) => e.equipment.includes('sled'))).toBe(true)
    const none = filterExercises(EXERCISE_LIBRARY, { ...EMPTY_FILTER, equipment: 'none' })
    expect(none.every((e) => e.equipment.length === 0)).toBe(true)
    expect(none.map((e) => e.slug)).toContain('burpee')
  })

  it('kombiniert mehrere Filter', () => {
    const result = filterExercises(EXERCISE_LIBRARY, {
      query: 'kreuzheben',
      category: 'strength',
      muscle: 'hamstrings',
      equipment: 'barbell',
    })
    expect(result.map((e) => e.slug)).toContain('romanian-deadlift')
    expect(result.map((e) => e.slug)).not.toContain('dumbbell-romanian-deadlift')
  })
})

describe('Filter in der Adresse', () => {
  it('überträgt einen Filter hin und zurück', () => {
    const filter: ExerciseFilter = {
      query: 'sled',
      category: 'hyrox',
      muscle: 'quadriceps',
      equipment: 'none',
    }
    expect(parseExerciseFilter(toSearchParams(filter))).toEqual(filter)
  })

  it('ignoriert ungültige Werte', () => {
    const params = new URLSearchParams('kategorie=quatsch&muskel=nase&geraet=rakete')
    expect(parseExerciseFilter(params)).toEqual(EMPTY_FILTER)
  })

  it('erkennt aktive Filter', () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false)
    expect(isFilterActive({ ...EMPTY_FILTER, query: ' ' })).toBe(false)
    expect(isFilterActive({ ...EMPTY_FILTER, muscle: 'chest' })).toBe(true)
  })
})
