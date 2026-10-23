import {
  BODY_METRICS,
  type BodyMetricKey,
  type BodyValues,
  type MeasurementEntry,
} from '@/domain/profile/bodyMetrics'
import { parseDecimal } from '@/features/profile/draft'

export { BODY_METRICS, type BodyMetricKey, type BodyValues, type MeasurementEntry }

export type MeasurementForm = Record<BodyMetricKey, string>

export const EMPTY_FORM: MeasurementForm = {
  weight_kg: '',
  body_fat_pct: '',
  waist_cm: '',
  chest_cm: '',
  arm_cm: '',
  thigh_cm: '',
}

export type ParsedMeasurement =
  | { ok: true; values: BodyValues }
  | { ok: false; errors: Partial<Record<BodyMetricKey | 'form', string>> }

/** Prüft die Eingaben; leere Felder bleiben unverändert, mindestens ein Wert ist nötig. */
export function parseMeasurementForm(form: MeasurementForm): ParsedMeasurement {
  const values: BodyValues = {}
  const errors: Partial<Record<BodyMetricKey | 'form', string>> = {}
  for (const metric of BODY_METRICS) {
    const value = parseDecimal(form[metric.key])
    if (value === undefined) continue
    if (Number.isNaN(value)) errors[metric.key] = 'Bitte eine Zahl eingeben (z. B. 84,5).'
    else if (value < metric.min || value > metric.max) {
      errors[metric.key] = `Erlaubt: ${metric.min}–${metric.max} ${metric.unit}`
    } else values[metric.key] = value
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  if (Object.keys(values).length === 0) {
    return { ok: false, errors: { form: 'Bitte mindestens einen Wert eintragen.' } }
  }
  return { ok: true, values }
}

/** Verlauf eines Werts, älteste zuerst – nur Tage, an denen er erfasst wurde. */
export function metricSeries(
  entries: readonly MeasurementEntry[],
  key: BodyMetricKey,
): { date: string; value: number }[] {
  return entries
    .flatMap((e) => {
      const value = e.values[key]
      return value === undefined ? [] : [{ date: e.date, value }]
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Werte, die mindestens einmal erfasst wurden (in fester Reihenfolge). */
export function recordedMetrics(entries: readonly MeasurementEntry[]): BodyMetricKey[] {
  return BODY_METRICS.map((m) => m.key).filter((key) =>
    entries.some((e) => e.values[key] !== undefined),
  )
}
