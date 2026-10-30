import type { ReadinessInput } from '@/domain/generator/types'
import type { AppSupabaseClient } from '@/lib/supabase'

/** Ein Tagesform-Check-in: vier Skalen 1–5, höher = besser. */
export interface Checkin {
  id: string
  checkedAt: string
  energy: number
  /** 1 = starker Muskelkater, 5 = keiner */
  soreness: number
  sleepQuality: number
  recovery: number
  score: number
}

export function toReadinessInput(checkin: Checkin): ReadinessInput {
  return {
    kind: 'checkin',
    energy: checkin.energy,
    soreness: checkin.soreness,
    sleepQuality: checkin.sleepQuality,
    recovery: checkin.recovery,
  }
}

/** Jüngster Check-in ab `since` (ISO-Zeitpunkt, z. B. heute 0:00 Uhr lokal) oder `null`. */
export async function fetchLatestCheckin(
  supabase: AppSupabaseClient,
  since: string,
): Promise<Checkin | null> {
  const { data, error } = await supabase
    .from('readiness_checkins')
    .select('id, checked_at, energy, soreness, sleep_quality, recovery, score')
    .gte('checked_at', since)
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
    ? {
        id: data.id,
        checkedAt: data.checked_at,
        energy: data.energy,
        soreness: data.soreness,
        sleepQuality: data.sleep_quality,
        recovery: data.recovery,
        score: Number(data.score),
      }
    : null
}

/** Speichert einen Check-in (gleiche ID → wird aktualisiert, nicht doppelt angelegt). */
export async function saveCheckin(supabase: AppSupabaseClient, checkin: Checkin): Promise<void> {
  const { error } = await supabase.from('readiness_checkins').upsert({
    id: checkin.id,
    checked_at: checkin.checkedAt,
    energy: checkin.energy,
    soreness: checkin.soreness,
    sleep_quality: checkin.sleepQuality,
    recovery: checkin.recovery,
    score: checkin.score,
  })
  if (error) throw error
}
