import { describe, expect, it } from 'vitest'
import { formatLongDay, formatWeek, isoWeekNumber } from './format'

describe('Kalenderformate', () => {
  it('berechnet die ISO-Kalenderwoche, auch am Jahreswechsel', () => {
    expect(isoWeekNumber('2026-10-26')).toBe(44)
    expect(isoWeekNumber('2026-01-01')).toBe(1)
    expect(isoWeekNumber('2027-01-01')).toBe(53)
    expect(isoWeekNumber('2024-12-30')).toBe(1)
  })

  it('formatiert Woche und Tag auf Deutsch', () => {
    expect(formatWeek('2026-10-26')).toBe('KW 44 · 26.10. – 1.11.')
    expect(formatLongDay('2026-10-26')).toBe('Montag, 26. Oktober')
  })
})
