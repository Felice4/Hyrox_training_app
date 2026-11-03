import { describe, expect, it } from 'vitest'
import { readinessScore } from '@/domain/readiness/readiness'
import { toReadinessInput } from './readiness'

describe('toReadinessInput', () => {
  it('macht aus einem gespeicherten Check-in die Eingabe für den Generator', () => {
    const input = toReadinessInput({
      id: 'c1',
      checkedAt: '2026-10-30T07:00:00Z',
      energy: 4,
      soreness: 2,
      sleepQuality: 3,
      recovery: 3,
      score: 3,
    })
    expect(input).toEqual({ kind: 'checkin', energy: 4, soreness: 2, sleepQuality: 3, recovery: 3 })
    expect(readinessScore(input)).toBe(3)
  })
})
