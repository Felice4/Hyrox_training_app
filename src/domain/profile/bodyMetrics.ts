/** Erfassbare Körperwerte – Grenzen wie in der Datenbank (Migration 0003). */
export const BODY_METRICS = [
  { key: 'weight_kg', label: 'Körpergewicht', unit: 'kg', min: 30, max: 250 },
  { key: 'body_fat_pct', label: 'Körperfett', unit: '%', min: 3, max: 60 },
  { key: 'waist_cm', label: 'Taille', unit: 'cm', min: 40, max: 200 },
  { key: 'chest_cm', label: 'Brust', unit: 'cm', min: 50, max: 200 },
  { key: 'arm_cm', label: 'Oberarm', unit: 'cm', min: 15, max: 70 },
  { key: 'thigh_cm', label: 'Oberschenkel', unit: 'cm', min: 30, max: 120 },
] as const

export type BodyMetricKey = (typeof BODY_METRICS)[number]['key']
export type BodyValues = Partial<Record<BodyMetricKey, number>>

export interface MeasurementEntry {
  id: string
  /** „JJJJ-MM-TT" */
  date: string
  values: BodyValues
  notes: string | null
}
