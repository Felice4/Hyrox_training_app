import { isCurrentRace, RACE_STATUSES, type Race, type RaceInput } from '@/domain/race/race'
import {
  RACE_CATEGORIES,
  RACE_FORMATS,
  RACE_GENDERS,
  type RaceCategory,
  type RaceFormat,
  type RaceGender,
} from '@/domain/race/variant'
import type { AppSupabaseClient } from '@/lib/supabase'
import type { Tables } from '@/types/database'

const oneOf = <T extends string>(values: readonly T[], value: string): value is T =>
  (values as readonly string[]).includes(value)

const COLUMNS =
  'id, name, race_date, plan_start, format, category, gender, days_per_week, weekdays, target_time_sec, status, result_time_sec, result_splits, result_session_id'

type RaceRow = Pick<
  Tables<'races'>,
  | 'id'
  | 'name'
  | 'race_date'
  | 'plan_start'
  | 'format'
  | 'category'
  | 'gender'
  | 'days_per_week'
  | 'weekdays'
  | 'target_time_sec'
  | 'status'
  | 'result_time_sec'
  | 'result_splits'
  | 'result_session_id'
>

/** Zeile → Wettkampf; unbekannte Werte (neuere App-Version) → `null`. */
export function toRace(row: RaceRow): Race | null {
  if (
    !oneOf<RaceFormat>(RACE_FORMATS, row.format) ||
    !oneOf<RaceCategory>(RACE_CATEGORIES, row.category) ||
    !oneOf<RaceGender>(RACE_GENDERS, row.gender) ||
    !oneOf(RACE_STATUSES, row.status)
  ) {
    return null
  }
  return {
    id: row.id,
    name: row.name,
    raceDate: row.race_date,
    planStart: row.plan_start,
    format: row.format,
    category: row.category,
    gender: row.gender,
    daysPerWeek: row.days_per_week,
    weekdays: [...row.weekdays].sort((a, b) => a - b),
    targetTimeSec: row.target_time_sec,
    status: row.status,
    resultTimeSec: row.result_time_sec,
    resultSplits: row.result_splits,
    resultSessionId: row.result_session_id,
  }
}

function toColumns(input: RaceInput) {
  return {
    name: input.name.trim(),
    race_date: input.raceDate,
    format: input.format,
    category: input.category,
    gender: input.gender,
    days_per_week: input.daysPerWeek,
    weekdays: [...new Set(input.weekdays)].sort((a, b) => a - b),
    target_time_sec: input.targetTimeSec,
  }
}

/**
 * Der aktuelle Wettkampf: der aktive (höchstens einer), sonst der zuletzt abgeschlossene
 * bis zum Ende seiner Erholungswoche – oder `null`.
 */
export async function fetchCurrentRace(
  supabase: AppSupabaseClient,
  today: string,
): Promise<Race | null> {
  const { data, error } = await supabase
    .from('races')
    .select(COLUMNS)
    .in('status', ['active', 'completed'])
    // „active“ vor „completed“, dann der neueste
    .order('status', { ascending: true })
    .order('race_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  const race = data ? toRace(data) : null
  return race && isCurrentRace(race, today) ? race : null
}

export interface CompleteRaceResult {
  newBest: boolean
  previousBestSec: number | null
}

/** Ergebnis speichern und abschließen (Datenbankfunktion complete_race, Migration 0013). */
export async function completeRace(
  supabase: AppSupabaseClient,
  input: { raceId: string; today: string; resultTimeSec: number; splits: number[] },
): Promise<CompleteRaceResult> {
  const { data, error } = await supabase.rpc('complete_race', {
    p: {
      race_id: input.raceId,
      today: input.today,
      result_time_sec: input.resultTimeSec,
      splits: input.splits,
    },
  })
  if (error) throw error
  const result = (data ?? {}) as { new_best?: unknown; previous_best_sec?: unknown }
  return {
    newBest: result.new_best === true,
    previousBestSec: typeof result.previous_best_sec === 'number' ? result.previous_best_sec : null,
  }
}

/** Legt den Wettkampf an; `planStart` ist der Montag, ab dem der Plan zählt. */
export async function createRace(
  supabase: AppSupabaseClient,
  input: RaceInput,
  planStart: string,
): Promise<Race> {
  const { data, error } = await supabase
    .from('races')
    .insert({ ...toColumns(input), plan_start: planStart })
    .select(COLUMNS)
    .single()
  if (error) throw error
  const race = toRace(data)
  if (!race) throw new Error('Unbekannte Werte im gespeicherten Wettkampf')
  return race
}

/** Ändert die Angaben (Planstart siehe `adjustPlanStart`). */
export async function updateRace(
  supabase: AppSupabaseClient,
  id: string,
  input: RaceInput,
  planStart: string,
): Promise<void> {
  const { error } = await supabase
    .from('races')
    .update({ ...toColumns(input), plan_start: planStart })
    .eq('id', id)
  if (error) throw error
}

/** Sagt den Wettkampf ab – danach plant die App wieder normal. */
export async function cancelRace(supabase: AppSupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('races').update({ status: 'cancelled' }).eq('id', id)
  if (error) throw error
}
