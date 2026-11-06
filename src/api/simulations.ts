import {
  DIVISIONS,
  SIMULATION_FORMATS,
  type Division,
  type SimulationFormat,
} from '@/domain/simulation/formats'
import type { SimulationRecord, SimulationResult } from '@/domain/simulation/simulation'
import type { AppSupabaseClient } from '@/lib/supabase'

const oneOf = <T extends string>(values: readonly T[], value: string): value is T =>
  (values as readonly string[]).includes(value)

/** Alle gespeicherten HYROX-Simulationen, neueste zuerst. */
export async function fetchSimulations(supabase: AppSupabaseClient): Promise<SimulationResult[]> {
  const { data, error } = await supabase
    .from('hyrox_simulations')
    .select('session_id, format, division, started_at, total_sec, splits')
    .order('started_at', { ascending: false })
  if (error) throw error
  return (data ?? []).flatMap((row) =>
    oneOf<SimulationFormat>(SIMULATION_FORMATS, row.format) &&
    oneOf<Division>(DIVISIONS, row.division)
      ? [
          {
            sessionId: row.session_id,
            format: row.format,
            division: row.division,
            startedAt: row.started_at,
            totalSec: row.total_sec,
            splits: row.splits,
          },
        ]
      : [],
  )
}

/** Speichert Format und Zwischenzeiten zu einem gespeicherten Training (idempotent). */
export async function saveSimulation(
  supabase: AppSupabaseClient,
  record: SimulationRecord,
): Promise<void> {
  const { error } = await supabase
    .from('hyrox_simulations')
    .upsert(record, { onConflict: 'session_id' })
  if (error) throw error
}
