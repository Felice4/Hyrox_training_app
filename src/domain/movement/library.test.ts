import { describe, expect, it } from 'vitest'
import { EXERCISE_LIBRARY, getLibraryExercise } from '@/data/exercises'
import { exerciseDefinitionSchema } from '@/data/exercises/schema'
import { exercisesInGroup, matchesSearch, originsOf } from './library'
import { HIP_SWITCH, MOVEMENT_FIXTURES, SHRIMP } from './testFixtures'

describe('Movement Lab', () => {
  it('liefert nur Movement-Übungen der Gruppe, alphabetisch', () => {
    // Nur fremde Kategorien beimischen – echte Movement-Übungen kommen laufend dazu
    const others = EXERCISE_LIBRARY.filter((e) => e.category !== 'movement')
    const mixed = [...MOVEMENT_FIXTURES, ...others]
    expect(exercisesInGroup(mixed, 'mobility').map((e) => e.slug)).toEqual(['movement-hip-switch'])
    expect(exercisesInGroup(mixed, 'core')).toEqual([SHRIMP])
  })

  it('filtert nach Stufe und Herkunft', () => {
    expect(exercisesInGroup(MOVEMENT_FIXTURES, 'ground', { level: 1 })).toEqual([])
    expect(exercisesInGroup(MOVEMENT_FIXTURES, 'ground', { origin: 'mma' })).toEqual([SHRIMP])
    expect(exercisesInGroup(MOVEMENT_FIXTURES, 'mobility', { origin: 'mma' })).toEqual([])
  })

  it('Herkünfte in fester Reihenfolge, ohne Doppelte', () => {
    expect(originsOf(MOVEMENT_FIXTURES)).toEqual(['bjj', 'boxing', 'mma'])
  })

  it('Suche über Name und Beschreibung', () => {
    expect(matchesSearch(HIP_SWITCH, 'hip')).toBe(true)
    expect(matchesSearch(HIP_SWITCH, 'TESTÜBUNG')).toBe(true)
    expect(matchesSearch(HIP_SWITCH, 'sprawl')).toBe(false)
    expect(matchesSearch(HIP_SWITCH, '  ')).toBe(true)
  })

  it('Bibliotheksübungen im Movement Lab sind gültig gruppiert', () => {
    const movement = EXERCISE_LIBRARY.filter((e) => e.category === 'movement')
    expect(
      movement.every((e) => e.movementGroups.length > 0 && e.slug.startsWith('movement-')),
    ).toBe(true)
  })

  it('Schema: Gruppen genau bei „movement", Herkunft nur bei movement/combat', () => {
    const base = { ...HIP_SWITCH }
    expect(exerciseDefinitionSchema.safeParse(base).success).toBe(true)
    expect(exerciseDefinitionSchema.safeParse({ ...base, movementGroups: [] }).success).toBe(false)
    const mobility = getLibraryExercise('couch-stretch')!
    expect(
      exerciseDefinitionSchema.safeParse({ ...mobility, movementGroups: ['mobility'] }).success,
    ).toBe(false)
    expect(exerciseDefinitionSchema.safeParse({ ...mobility, combatSports: ['bjj'] }).success).toBe(
      false,
    )
  })
})
