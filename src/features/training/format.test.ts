import { describe, expect, it } from 'vitest'
import { describeRecord, describeTarget, rpeLabel } from './format'

describe('describeTarget', () => {
  it('beschreibt Vorgaben kompakt', () => {
    expect(describeTarget({ reps: 5, weightKg: 102.5 })).toBe('5 Wdh. · 102,5 kg')
    expect(describeTarget({ distanceM: 1000 })).toBe('1 km')
    expect(describeTarget({ durationSec: 45 })).toBe('0:45')
    expect(describeTarget({ distanceM: 25, weightKg: 152 })).toBe('25 m · 152 kg')
    expect(describeTarget({})).toBe('')
  })
})

describe('describeRecord', () => {
  it('benennt die Rekordarten verständlich', () => {
    expect(describeRecord({ record_type: 'estimated_1rm', context_key: '', value: 116.5 })).toEqual(
      {
        label: 'Geschätztes Maximalgewicht (1 Wdh.)',
        value: '116,5 kg',
      },
    )
    expect(
      describeRecord({ record_type: 'max_weight', context_key: 'reps=5', value: 100 }).label,
    ).toBe('Höchstes Gewicht für 5 Wdh.')
    expect(
      describeRecord({ record_type: 'max_weight', context_key: 'distance_m=25', value: 152 }).label,
    ).toBe('Höchstes Gewicht über 25 m')
    expect(
      describeRecord({ record_type: 'best_time', context_key: 'distance_m=1000', value: 287 }),
    ).toEqual({
      label: 'Bestzeit über 1 km',
      value: '4:47',
    })
    expect(describeRecord({ record_type: 'max_reps', context_key: '', value: 12 }).value).toBe('12')
  })
})

describe('rpeLabel', () => {
  it('beschreibt die Skala', () => {
    expect(rpeLabel(1)).toBe('sehr leicht')
    expect(rpeLabel(7)).toBe('schwer')
    expect(rpeLabel(10)).toBe('maximal')
  })
})
