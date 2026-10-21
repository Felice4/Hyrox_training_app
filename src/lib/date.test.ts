import { describe, expect, it } from 'vitest'
import { toLocalIsoDate } from './date'

describe('toLocalIsoDate', () => {
  it('verwendet das lokale Datum mit führenden Nullen', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05')
    expect(toLocalIsoDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })
})
