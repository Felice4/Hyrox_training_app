import { describe, expect, it } from 'vitest'
import { distanceIncrement } from './steps'

describe('distanceIncrement', () => {
  it('nimmt grobe Schritte bei Läufen und feine bei kurzen Strecken', () => {
    expect(distanceIncrement(undefined)).toBe(10)
    expect(distanceIncrement(1000)).toBe(100)
    expect(distanceIncrement(250)).toBe(10)
    expect(distanceIncrement(25)).toBe(2.5)
  })
})
