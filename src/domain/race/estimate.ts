import { STATIONS, type Division, type StationKey } from '@/domain/simulation/formats'
import { simulationStats, type SimulationResult } from '@/domain/simulation/simulation'
import { addDays } from '@/lib/date'
import type { RaceFormat } from './variant'

/**
 * Zielzeit-Schätzung und Zieltempo (docs/RACE_PREP.md §6). Regelbasiert:
 * Laufzeit × Ermüdungsfaktor + Stationen + Roxzone. Grundlage ist die aussagekräftigste
 * Simulation der letzten 12 Wochen, sonst der 1-km-Lauftest. Alle Faktoren sind
 * Richtwerte – die Schätzung ist ein Bereich, kein Versprechen.
 */

/** Nur Simulationen der letzten 12 Wochen zählen – ältere sagen wenig über die Form. */
export const ESTIMATE_WINDOW_DAYS = 84

/** 1-km-Bestzeit → durchschnittlicher Kilometer im Rennen (Ermüdung durch die Stationen). */
const RUN_TEST_FATIGUE = 1.22
/** Kurz-Simulation: 500 m → 1 km und halbe → ganze Stationen werden langsamer. */
const SHORT_RUN_FACTOR = 2 * 1.08
const SHORT_STATION_FACTOR = 2 * 1.15
/** Eine Hälfte → ganzes Rennen (zweite Hälfte mit Vorermüdung). */
const HALF_FACTOR = 2 * 1.06
/** Hälfte 2 nach Hälfte 1 im Rennen: Vorermüdung. */
const SECOND_HALF_FATIGUE = 1.08
/** Roxzone im Rennen: rund 6 min; in der Simulation zu Hause meist nur 1–2 min. */
const RACE_ROXZONE_SEC = 6 * 60
const SIMULATION_ROXZONE_EXTRA_SEC = 4 * 60
/** Stationszeit ohne Simulation – grobe Richtwerte für ein mittleres Niveau. */
const DEFAULT_STATION_SEC: Record<Division, number> = {
  open_men: 36 * 60,
  open_women: 40 * 60,
  pro_men: 40 * 60,
  pro_women: 42 * 60,
}

/**
 * Typische Verteilung der Stationszeit (Anteile, Summe 1) – für Richtzeiten je Station.
 * Grobe Werte aus veröffentlichten Rennanalysen; sie dienen nur zur Orientierung.
 */
export const STATION_TIME_SHARE: Record<StationKey, number> = {
  skierg: 0.13,
  sled_push: 0.1,
  sled_pull: 0.12,
  burpee_broad_jump: 0.14,
  row: 0.13,
  farmers_carry: 0.06,
  sandbag_lunges: 0.13,
  wall_balls: 0.19,
}

/** Anteile an der Gesamtzeit, wenn es noch keine Schätzung gibt. */
const DEFAULT_SHARES = { run: 0.5, roxzone: 0.07, station: 0.43 }

export type EstimateSource =
  | { kind: 'simulation'; format: SimulationResult['format']; date: string }
  | { kind: 'halves'; date: string }
  | { kind: 'run_test'; runSec: number }

export interface RaceEstimate {
  lowSec: number
  highSec: number
  /** Mitte des Bereichs – Vorschlag für die Zielzeit */
  centerSec: number
  runSec: number
  stationSec: number
  roxzoneSec: number
  source: EstimateSource
  /** Für Staffel: nur die eigenen 2 Runden */
  scope: 'race' | 'team' | 'own_legs'
}

interface Parts {
  runSec: number
  stationSec: number
  roxzoneSec: number
  spread: number
  source: EstimateSource
}

const latest = (results: readonly SimulationResult[], format: SimulationResult['format']) =>
  results
    .filter((r) => r.format === format)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0]

const day = (iso: string) => iso.slice(0, 10)

/** Volles Rennen allein (Singles) aus der besten verfügbaren Grundlage. */
function singlesParts(
  simulations: readonly SimulationResult[],
  run1kSec: number | null,
  division: Division,
): Parts | undefined {
  const full = latest(simulations, 'full')
  if (full) {
    const stats = simulationStats(full)
    return {
      runSec: stats.runSec,
      stationSec: stats.stationSec,
      roxzoneSec: SIMULATION_ROXZONE_EXTRA_SEC,
      spread: 0.03,
      source: { kind: 'simulation', format: 'full', date: day(full.startedAt) },
    }
  }
  const half1 = latest(simulations, 'half_1')
  const half2 = latest(simulations, 'half_2')
  if (half1 && half2) {
    const first = simulationStats(half1)
    const second = simulationStats(half2)
    const newest = half1.startedAt > half2.startedAt ? half1 : half2
    return {
      runSec: first.runSec + second.runSec * SECOND_HALF_FATIGUE,
      stationSec: first.stationSec + second.stationSec * SECOND_HALF_FATIGUE,
      roxzoneSec: SIMULATION_ROXZONE_EXTRA_SEC,
      spread: 0.04,
      source: { kind: 'halves', date: day(newest.startedAt) },
    }
  }
  const half = [half1, half2]
    .filter((r) => r !== undefined)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0]
  if (half) {
    const stats = simulationStats(half)
    return {
      runSec: stats.runSec * HALF_FACTOR,
      stationSec: stats.stationSec * HALF_FACTOR,
      roxzoneSec: SIMULATION_ROXZONE_EXTRA_SEC,
      spread: 0.06,
      source: { kind: 'simulation', format: half.format, date: day(half.startedAt) },
    }
  }
  const short = latest(simulations, 'short')
  if (short) {
    const stats = simulationStats(short)
    return {
      runSec: stats.runSec * SHORT_RUN_FACTOR,
      stationSec: stats.stationSec * SHORT_STATION_FACTOR,
      roxzoneSec: SIMULATION_ROXZONE_EXTRA_SEC,
      spread: 0.07,
      source: { kind: 'simulation', format: 'short', date: day(short.startedAt) },
    }
  }
  if (run1kSec !== null && run1kSec > 0) {
    return {
      runSec: 8 * run1kSec * RUN_TEST_FATIGUE,
      stationSec: DEFAULT_STATION_SEC[division],
      roxzoneSec: RACE_ROXZONE_SEC,
      spread: 0.1,
      source: { kind: 'run_test', runSec: run1kSec },
    }
  }
  return undefined
}

const toMinute = (sec: number) => Math.round(sec / 60) * 60

/**
 * Schätzt die Zielzeit als Bereich – `undefined` ohne Simulation und ohne 1-km-Zeit.
 * Doubles: Stationen geteilt (≈ 60 % der Zeit allein). Staffel: nur die eigenen 2 Runden.
 */
export function estimateRaceTime(input: {
  simulations: readonly SimulationResult[]
  /** Beste 1-km-Zeit (Sekunden) oder `null` */
  run1kSec: number | null
  division: Division
  format: RaceFormat
  today: string
}): RaceEstimate | undefined {
  const from = addDays(input.today, -ESTIMATE_WINDOW_DAYS)
  const recent = input.simulations.filter((s) => day(s.startedAt) >= from)
  const parts = singlesParts(recent, input.run1kSec, input.division)
  if (!parts) return undefined

  let { runSec, stationSec, roxzoneSec } = parts
  let scope: RaceEstimate['scope'] = 'race'
  if (input.format === 'double') {
    stationSec *= 0.6
    scope = 'team'
  } else if (input.format === 'relay') {
    // 2 von 8 Runden, ausgeruhter als im Einzelrennen
    runSec *= (2 / 8) * 0.95
    stationSec *= (2 / 8) * 0.9
    roxzoneSec *= 2 / 8
    scope = 'own_legs'
  }
  const total = runSec + stationSec + roxzoneSec
  return {
    lowSec: toMinute(total * (1 - parts.spread)),
    highSec: toMinute(total * (1 + parts.spread)),
    centerSec: toMinute(total),
    runSec: Math.round(runSec),
    stationSec: Math.round(stationSec),
    roxzoneSec: Math.round(roxzoneSec),
    source: parts.source,
    scope,
  }
}

/** Bestzeit über 1 km aus den Bestleistungen (`hyrox-run`, Zeit, 1000 m). */
export function bestRun1k(
  records: readonly {
    exerciseSlug: string
    recordType: string
    contextKey: string
    value: number
  }[],
): number | null {
  const values = records
    .filter(
      (r) =>
        r.exerciseSlug === 'hyrox-run' &&
        r.recordType === 'best_time' &&
        r.contextKey === 'distance_m=1000',
    )
    .map((r) => r.value)
  return values.length > 0 ? Math.min(...values) : null
}

export interface TargetPlan {
  /** Renntempo je km (Sekunden) */
  paceSecPerKm: number
  runSec: number
  roxzoneSec: number
  stationSec: number
  /** Richtzeit je Station – nicht für die Staffel (welche Stationen, ist offen) */
  stations: { station: StationKey; sec: number }[]
}

/**
 * Teilt eine Zielzeit in Laufen, Roxzone und Stationen – mit den Anteilen der Schätzung,
 * sonst mit typischen Anteilen (50 % Laufen, 7 % Roxzone, 43 % Stationen).
 */
export function targetPlan(
  targetSec: number,
  format: RaceFormat,
  estimate?: Pick<RaceEstimate, 'runSec' | 'stationSec' | 'roxzoneSec'>,
): TargetPlan {
  const total = estimate ? estimate.runSec + estimate.stationSec + estimate.roxzoneSec : 0
  const shares =
    estimate && total > 0
      ? {
          run: estimate.runSec / total,
          roxzone: estimate.roxzoneSec / total,
          station: estimate.stationSec / total,
        }
      : DEFAULT_SHARES
  const km = format === 'relay' ? 2 : 8
  const runSec = Math.round(targetSec * shares.run)
  const stationSec = Math.round(targetSec * shares.station)
  return {
    paceSecPerKm: Math.round(runSec / km),
    runSec,
    roxzoneSec: Math.round(targetSec * shares.roxzone),
    stationSec,
    stations:
      format === 'relay'
        ? []
        : STATIONS.map((s) => ({
            station: s.station,
            sec: Math.round(stationSec * STATION_TIME_SHARE[s.station]),
          })),
  }
}

/** Weicht die Schätzung deutlich (> 3 %) von der Zielzeit ab? */
export function targetDiffers(targetSec: number, estimate: RaceEstimate): boolean {
  return Math.abs(estimate.centerSec - targetSec) / targetSec > 0.03
}
