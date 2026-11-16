import { describe, expect, it } from 'vitest'
import { getLibraryExercise } from '@/data/exercises'
import { isUnlocked, LEARN_CARDS, reachedStage } from './learn'
import { raceTimeline } from './phases'

// Plan 16.11.2026 – 17.01.2027: Aufbau ×3, Entlastung, Spezifisch ×3, Tapering, Wettkampfwoche
const timeline = raceTimeline({ planStart: '2026-11-16', raceDate: '2027-01-17' })

describe('reachedStage', () => {
  it('folgt den Phasen; die Entlastung behält die Stufe davor', () => {
    expect(reachedStage(timeline, '2026-11-01')).toBe('start')
    expect(reachedStage(timeline, '2026-11-18')).toBe('start')
    expect(reachedStage(timeline, '2026-12-09')).toBe('start')
    expect(reachedStage(timeline, '2026-12-16')).toBe('build')
    expect(reachedStage(timeline, '2027-01-06')).toBe('taper')
    expect(reachedStage(timeline, '2027-01-12')).toBe('race')
    expect(reachedStage(timeline, '2027-01-20')).toBe('race')
    expect(reachedStage(timeline, '2027-03-01')).toBe('race')
  })
})

describe('LEARN_CARDS', () => {
  it('schaltet je Stufe mehr Karten frei', () => {
    const count = (stage: Parameters<typeof isUnlocked>[1]) =>
      LEARN_CARDS.filter((card) => isUnlocked(card, stage)).length
    expect(count('start')).toBe(2)
    expect(count('build')).toBe(4)
    expect(count('taper')).toBe(5)
    expect(count('race')).toBe(LEARN_CARDS.length)
  })

  it('hat eindeutige IDs und verweist nur auf vorhandene Übungen', () => {
    expect(new Set(LEARN_CARDS.map((c) => c.id)).size).toBe(LEARN_CARDS.length)
    for (const link of LEARN_CARDS.flatMap((c) => c.links ?? [])) {
      expect(getLibraryExercise(link.slug), link.slug).toBeDefined()
    }
  })
})
