import { describe, expect, it } from 'vitest'
import {
  EMPTY_FORM,
  metricSeries,
  parseMeasurementForm,
  recordedMetrics,
  type MeasurementEntry,
} from './measurements'

describe('parseMeasurementForm', () => {
  it('übernimmt nur ausgefüllte Felder, auch mit Komma', () => {
    expect(parseMeasurementForm({ ...EMPTY_FORM, weight_kg: '84,5', waist_cm: '86' })).toEqual({
      ok: true,
      values: { weight_kg: 84.5, waist_cm: 86 },
    })
  })

  it('meldet ungültige Zahlen und Werte außerhalb der Grenzen', () => {
    const result = parseMeasurementForm({ ...EMPTY_FORM, weight_kg: 'abc', arm_cm: '90' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.weight_kg).toContain('Zahl')
      expect(result.errors.arm_cm).toBe('Erlaubt: 15–70 cm')
    }
  })

  it('verlangt mindestens einen Wert', () => {
    expect(parseMeasurementForm(EMPTY_FORM)).toEqual({
      ok: false,
      errors: { form: 'Bitte mindestens einen Wert eintragen.' },
    })
  })
})

describe('Verläufe', () => {
  const entries: MeasurementEntry[] = [
    { id: 'b', date: '2026-10-20', values: { weight_kg: 84 }, notes: null },
    { id: 'a', date: '2026-10-01', values: { weight_kg: 85.5, waist_cm: 88 }, notes: null },
  ]

  it('zeigt nur tatsächlich erfasste Werte, älteste zuerst', () => {
    expect(metricSeries(entries, 'weight_kg')).toEqual([
      { date: '2026-10-01', value: 85.5 },
      { date: '2026-10-20', value: 84 },
    ])
    expect(metricSeries(entries, 'waist_cm')).toEqual([{ date: '2026-10-01', value: 88 }])
    expect(recordedMetrics(entries)).toEqual(['weight_kg', 'waist_cm'])
  })
})
