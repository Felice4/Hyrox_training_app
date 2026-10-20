import { describe, expect, it } from 'vitest'
import { describeLoad, formatDistance, formatDuration, formatRange } from './format'

describe('formatRange', () => {
  it('zeigt Bereiche und Einzelwerte', () => {
    expect(formatRange([3, 5])).toBe('3–5')
    expect(formatRange([5, 5])).toBe('5')
    expect(formatRange([8, 12], 'Wdh.')).toBe('8–12 Wdh.')
  })

  it('verwendet ein Dezimalkomma', () => {
    expect(formatRange([12.5, 25], 'm')).toBe('12,5–25 m')
  })
})

describe('formatDistance', () => {
  it('zeigt kurze Strecken in Metern', () => {
    expect(formatDistance([400, 1000])).toBe('400–1000 m')
  })

  it('zeigt lange Strecken in Kilometern', () => {
    expect(formatDistance([1000, 1000])).toBe('1 km')
    expect(formatDistance([4000, 12000])).toBe('4–12 km')
  })
})

describe('formatDuration', () => {
  it('zeigt kurze Dauern in Sekunden', () => {
    expect(formatDuration([30, 60])).toBe('30–60 s')
  })

  it('zeigt lange Dauern in Minuten', () => {
    expect(formatDuration([300, 600])).toBe('5–10 min')
    expect(formatDuration([90, 150])).toBe('1,5–2,5 min')
  })
})

describe('describeLoad', () => {
  it('beschreibt nur vorhandene Angaben', () => {
    expect(describeLoad({ sets: [3, 5], reps: [4, 10], restSec: [90, 180] })).toEqual([
      { label: 'Sätze / Runden', value: '3–5' },
      { label: 'Wiederholungen', value: '4–10' },
      { label: 'Pause', value: '1,5–3 min' },
    ])
  })

  it('lässt eine Pause von 0 weg', () => {
    const lines = describeLoad({ sets: [1, 1], durationSec: [300, 600], restSec: [0, 0] })
    expect(lines.map((l) => l.label)).toEqual(['Sätze / Runden', 'Dauer'])
  })
})
