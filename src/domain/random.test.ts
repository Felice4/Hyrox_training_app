import { describe, expect, it } from 'vitest'
import { createRandom, weightedPick } from './random'

describe('createRandom', () => {
  it('liefert bei gleichem Seed dieselbe Folge', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    const seqA = Array.from({ length: 5 }, () => a())
    const seqB = Array.from({ length: 5 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('liefert bei anderem Seed eine andere Folge', () => {
    expect(createRandom(1)()).not.toBe(createRandom(2)())
  })

  it('bleibt im Bereich [0, 1)', () => {
    const random = createRandom(7)
    for (let i = 0; i < 1000; i++) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('weightedPick', () => {
  it('wählt nie ein Element mit Gewicht 0', () => {
    const random = createRandom(3)
    for (let i = 0; i < 200; i++) {
      expect(weightedPick(['a', 'b', 'c'], [0, 1, 0], random)).toBe('b')
    }
  })

  it('bevorzugt höhere Gewichte', () => {
    const random = createRandom(9)
    const counts = { a: 0, b: 0 }
    for (let i = 0; i < 2000; i++) counts[weightedPick(['a', 'b'] as const, [1, 3], random)]++
    expect(counts.b).toBeGreaterThan(counts.a * 2)
  })

  it('wählt bei lauter Nullgewichten trotzdem ein Element', () => {
    expect(['x', 'y']).toContain(weightedPick(['x', 'y'], [0, 0], createRandom(1)))
  })
})
