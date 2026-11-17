import { describe, expect, it } from 'vitest'
import { EXERCISE_LIBRARY } from '@/data/exercises'
import { COMBAT_SPORTS } from '@/data/exercises/vocabulary'
import { drillsForSport, groupByLevel, matchesGi } from './drills'

describe('Kampfsport-Drills', () => {
  it('jede Sportart hat Drills auf allen drei Stufen', () => {
    for (const sport of COMBAT_SPORTS) {
      const levels = groupByLevel(drillsForSport(EXERCISE_LIBRARY, sport)).map((g) => g.level)
      expect(levels, sport).toEqual([1, 2, 3])
    }
  })

  it('jede Sportart hat mindestens 8 Drills', () => {
    for (const sport of COMBAT_SPORTS) {
      expect(drillsForSport(EXERCISE_LIBRARY, sport).length, sport).toBeGreaterThanOrEqual(8)
    }
  })

  it('liefert nur Kampfsport-Drills der Sportart', () => {
    const boxing = drillsForSport(EXERCISE_LIBRARY, 'boxing')
    expect(boxing.every((d) => d.category === 'combat' && d.combatSports.includes('boxing'))).toBe(
      true,
    )
    expect(boxing.some((d) => d.slug === 'mma-dirty-boxing')).toBe(true)
  })

  it('filtert nach Stufe', () => {
    const advanced = drillsForSport(EXERCISE_LIBRARY, 'judo', { level: 3 })
    expect(advanced.length).toBeGreaterThan(0)
    expect(advanced.every((d) => d.difficulty === 3)).toBe(true)
  })

  it('Gi/NoGi: Drills für beides passen immer', () => {
    expect(matchesGi({ giMode: 'both' }, 'nogi')).toBe(true)
    expect(matchesGi({ giMode: undefined }, 'gi')).toBe(true)
    expect(matchesGi({ giMode: 'gi' }, 'nogi')).toBe(false)
    expect(matchesGi({ giMode: 'nogi' }, 'all')).toBe(true)
    const nogi = drillsForSport(EXERCISE_LIBRARY, 'bjj', { gi: 'nogi' })
    expect(nogi.some((d) => d.slug === 'bjj-berimbolo')).toBe(false)
    expect(nogi.some((d) => d.slug === 'bjj-single-leg-x-entry')).toBe(true)
  })

  it('der Gi-Filter gilt nur bei BJJ', () => {
    const judo = drillsForSport(EXERCISE_LIBRARY, 'judo', { gi: 'nogi' })
    expect(judo.some((d) => d.slug === 'judo-grip-circuit')).toBe(true)
  })
})
