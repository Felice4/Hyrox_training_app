import { BODY_METRICS, type BodyValues, type MeasurementEntry } from '@/domain/profile/bodyMetrics'
import type { AppSupabaseClient } from '@/lib/supabase'

/** Alle Körpermesswerte, neueste zuerst. */
export async function fetchMeasurements(supabase: AppSupabaseClient): Promise<MeasurementEntry[]> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('id, measured_on, weight_kg, body_fat_pct, waist_cm, chest_cm, arm_cm, thigh_cm, notes')
    .order('measured_on', { ascending: false })
  if (error) throw error
  return data.map((row) => {
    const values: BodyValues = {}
    for (const metric of BODY_METRICS) {
      const value = row[metric.key]
      if (value !== null) values[metric.key] = Number(value)
    }
    return { id: row.id, date: row.measured_on, values, notes: row.notes }
  })
}

/**
 * Speichert Werte für einen Tag. Gibt es an dem Tag schon einen Eintrag, werden nur die
 * übergebenen Werte ersetzt – andere bleiben erhalten (ein Eintrag pro Tag).
 */
export async function saveMeasurement(
  supabase: AppSupabaseClient,
  date: string,
  values: BodyValues,
  notes: string | undefined,
): Promise<void> {
  const { error } = await supabase
    .from('body_measurements')
    .upsert(
      { measured_on: date, ...values, ...(notes ? { notes } : {}) },
      { onConflict: 'user_id,measured_on' },
    )
  if (error) throw error
}

export async function deleteMeasurement(supabase: AppSupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('body_measurements').delete().eq('id', id)
  if (error) throw error
}
