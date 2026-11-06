import type { Measurement } from '@/data/exercises/vocabulary'
import { HYROX_STATION_LABELS } from '@/data/exercises/vocabulary'
import type { GeneratedWorkout, PlannedSet, WorkoutItem } from '@/domain/generator/types'
import { createSession, finishSession } from '@/domain/session/session'
import type { ActiveSession } from '@/domain/session/types'
import {
  DIVISION_LABELS,
  formatPlan,
  RUN_EXERCISE,
  SIMULATION_FORMAT_LABELS,
  type Division,
  type SimulationFormat,
  type StationKey,
} from './formats'

/**
 * HYROX-Simulation als reine Funktionen (docs/SIMULATION.md): Ablauf mit Rennuhr,
 * Zwischenzeit je Abschnitt (Lauf inkl. Roxzone, Station), Vergleich und Auswertung.
 */

export const SIMULATION_VERSION = 'simulation-1'

export interface Segment {
  kind: 'run' | 'station'
  /** Runde 1–8 (Lauf und Station einer Runde haben dieselbe Nummer) */
  round: number
  station: StationKey | 'run'
  exerciseSlug: string
  label: string
  distanceM?: number | undefined
  reps?: number | undefined
  weightKg?: number | undefined
  weightNote?: string | undefined
}

/** Abschnitte in Wettkampfreihenfolge: Lauf, Station, Lauf, Station, … */
export function buildSegments(format: SimulationFormat, division: Division): Segment[] {
  const { stations, runM, share } = formatPlan(format)
  return stations.flatMap((spec, index): Segment[] => {
    const round = index + 1
    return [
      {
        kind: 'run',
        round,
        station: 'run',
        exerciseSlug: RUN_EXERCISE,
        label: `Lauf ${round}`,
        distanceM: runM,
      },
      {
        kind: 'station',
        round,
        station: spec.station,
        exerciseSlug: spec.exerciseSlug,
        label: HYROX_STATION_LABELS[spec.station],
        distanceM: spec.distanceM === undefined ? undefined : spec.distanceM * share,
        reps: spec.reps === undefined ? undefined : spec.reps * share,
        weightKg: spec.weightKg?.[division],
        weightNote: spec.weightNote,
      },
    ]
  })
}

/** „1000 m · 152 kg inkl. Schlitten" */
export function describeSegment(segment: Segment): string {
  const parts = [
    segment.distanceM !== undefined ? `${segment.distanceM.toLocaleString('de-DE')} m` : '',
    segment.reps !== undefined ? `${segment.reps} Wdh.` : '',
    segment.weightKg !== undefined
      ? `${segment.weightKg.toLocaleString('de-DE')} kg${segment.weightNote ? ` ${segment.weightNote}` : ''}`
      : '',
  ]
  return parts.filter(Boolean).join(' · ')
}

/** Das Workout zur Simulation – ein Block, je Abschnitt eine Übung mit einem Satz. */
export function buildSimulationWorkout(
  format: SimulationFormat,
  division: Division,
  seed = 0,
): GeneratedWorkout {
  const segments = buildSegments(format, division)
  const items: WorkoutItem[] = segments.map((segment) => {
    const set: PlannedSet = {
      type: segment.kind === 'run' ? 'interval' : 'round',
      distanceM: segment.distanceM,
      reps: segment.reps,
      weightKg: segment.weightKg,
      restSec: 0,
    }
    return {
      exerciseSlug: segment.exerciseSlug,
      exerciseName: segment.kind === 'run' ? `${segment.label} (HYROX)` : segment.label,
      role: segment.kind === 'run' ? 'run' : 'station',
      sets: [set],
      note: describeSegment(segment) || undefined,
      // Grobe Schätzung für Kalender und Anzeige: 5 min je Lauf (1 km), 5 min je Station
      estimatedSec: segment.kind === 'run' ? (segment.distanceM ?? 1000) * 0.3 : 300,
    }
  })
  const estimatedSec = items.reduce((sum, i) => sum + i.estimatedSec, 0)
  return {
    generatorVersion: SIMULATION_VERSION,
    seed,
    focus: 'hyrox',
    intensity: 'hard',
    targetDurationMin: Math.max(10, Math.round(estimatedSec / 60)),
    estimatedDurationMin: Math.round(estimatedSec / 60),
    blocks: [{ type: 'main', items }],
    explanation: [
      `HYROX-Simulation ${SIMULATION_FORMAT_LABELS[format]}, ${DIVISION_LABELS[division]}.`,
      'Die Rennuhr läuft durch; nach jedem Abschnitt „Abschnitt fertig" tippen. Die Roxzone zählt zum Lauf.',
    ],
    recoverySuggested: false,
  }
}

/** Neue Simulation (Rennuhr noch nicht gestartet). */
export function createSimulation(
  format: SimulationFormat,
  division: Division,
  now: string,
  newId: () => string,
  measurementOf: (slug: string) => Measurement,
): ActiveSession {
  const workout = buildSimulationWorkout(format, division)
  return { ...createSession(workout, now, newId, measurementOf), simulation: { format, division } }
}

/** Startet die Rennuhr – ab jetzt zählt auch die Trainingszeit. */
export function startRace(session: ActiveSession, now: string): ActiveSession {
  if (!session.simulation || session.simulation.raceStartedAt) return session
  return {
    ...session,
    startedAt: now,
    pausedSec: 0,
    pausedSince: undefined,
    simulation: { ...session.simulation, raceStartedAt: now },
  }
}

const seconds = (from: string, to: string) =>
  Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000))

/** Index des laufenden Abschnitts; `undefined`, wenn alle geschafft. */
export function currentSegmentIndex(session: ActiveSession): number | undefined {
  const index = session.exercises.findIndex((e) => !e.sets[0]?.completed)
  return index === -1 ? undefined : index
}

/** Ende des letzten geschafften Abschnitts bzw. Start der Rennuhr. */
function lastMark(session: ActiveSession): string | undefined {
  const done = session.exercises.flatMap((e) =>
    e.sets[0]?.completedAt ? [e.sets[0].completedAt] : [],
  )
  return done.at(-1) ?? session.simulation?.raceStartedAt
}

/** Gesamtzeit der Rennuhr in Sekunden. */
export function raceElapsed(session: ActiveSession, now: string): number {
  const start = session.simulation?.raceStartedAt
  if (!start) return 0
  return seconds(start, session.finishedAt ?? now)
}

/** Zeit im laufenden Abschnitt in Sekunden. */
export function segmentElapsed(session: ActiveSession, now: string): number {
  const mark = lastMark(session)
  return mark ? seconds(mark, session.finishedAt ?? now) : 0
}

/**
 * „Abschnitt fertig": Zwischenzeit des laufenden Abschnitts eintragen (Vorgaben werden
 * als geschafft übernommen). Nach dem letzten Abschnitt ist die Simulation beendet.
 */
export function recordSplit(session: ActiveSession, now: string): ActiveSession {
  const index = currentSegmentIndex(session)
  const mark = lastMark(session)
  if (index === undefined || !mark || session.finishedAt) return session
  const durationSec = Math.max(1, seconds(mark, now))
  const exercises = session.exercises.map((exercise, i) =>
    i === index
      ? {
          ...exercise,
          sets: exercise.sets.map((set, si) =>
            si === 0
              ? {
                  ...set,
                  actual: {
                    reps: set.target.reps,
                    weightKg: set.target.weightKg,
                    distanceM: set.target.distanceM,
                    durationSec,
                  },
                  completed: true,
                  completedAt: now,
                }
              : set,
          ),
        }
      : exercise,
  )
  const next = { ...session, exercises, cursor: Math.min(index + 1, exercises.length - 1) }
  return index === exercises.length - 1 ? finishSession(next, now) : next
}

/** Letzte Zwischenzeit zurücknehmen (Fehltipp); die Uhr läuft für diesen Abschnitt weiter. */
export function undoSplit(session: ActiveSession): ActiveSession {
  const current = currentSegmentIndex(session)
  const index = (current ?? session.exercises.length) - 1
  if (index < 0) return session
  const exercises = session.exercises.map((exercise, i) =>
    i === index
      ? {
          ...exercise,
          sets: exercise.sets.map((set, si) =>
            si === 0 ? { ...set, actual: {}, completed: false, completedAt: undefined } : set,
          ),
        }
      : exercise,
  )
  return { ...session, exercises, cursor: index, finishedAt: undefined }
}

/** Zwischenzeiten der geschafften Abschnitte in Sekunden. */
export function splitTimes(session: ActiveSession): number[] {
  return session.exercises.flatMap((e) => {
    const set = e.sets[0]
    return set?.completed && set.actual.durationSec !== undefined ? [set.actual.durationSec] : []
  })
}

/** Datensatz für die Tabelle `hyrox_simulations` (Migration 0009). */
export interface SimulationRecord {
  session_id: string
  format: SimulationFormat
  division: Division
  started_at: string
  total_sec: number
  splits: number[]
}

export function toSimulationRecord(session: ActiveSession): SimulationRecord | undefined {
  const meta = session.simulation
  const splits = splitTimes(session)
  if (!meta?.raceStartedAt || splits.length === 0) return undefined
  return {
    session_id: session.id,
    format: meta.format,
    division: meta.division,
    started_at: meta.raceStartedAt,
    total_sec: splits.reduce((a, b) => a + b, 0),
    splits,
  }
}

// -----------------------------------------------------------------------------
// Vergleich und Auswertung
// -----------------------------------------------------------------------------

/** Gespeicherte Simulation (aus der Datenbank). */
export interface SimulationResult {
  sessionId: string
  format: SimulationFormat
  division: Division
  startedAt: string
  totalSec: number
  splits: number[]
}

/** Letzte frühere Simulation desselben Formats (vor `before`). */
export function previousSimulation(
  results: readonly SimulationResult[],
  format: SimulationFormat,
  before: string,
  excludeSessionId?: string,
): SimulationResult | undefined {
  return results
    .filter(
      (r) =>
        r.format === format &&
        r.sessionId !== excludeSessionId &&
        Date.parse(r.startedAt) < Date.parse(before),
    )
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0]
}

/** Differenz je Abschnitt (positiv = langsamer als beim Vergleich). */
export function splitDeltas(
  current: readonly number[],
  previous: readonly number[] | undefined,
): (number | undefined)[] {
  return current.map((value, i) => {
    const before = previous?.[i]
    return before === undefined ? undefined : value - before
  })
}

/** Rückstand nach `count` Abschnitten (für „+0:12" während des Rennens). */
export function cumulativeDelta(
  current: readonly number[],
  previous: readonly number[] | undefined,
): number | undefined {
  if (!previous || previous.length < current.length || current.length === 0) return undefined
  const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0)
  return sum(current) - sum(previous.slice(0, current.length))
}

/** Die größten Zeitverluste gegenüber dem Vergleich (Abschnitts-Indizes, größter zuerst). */
export function biggestLosses(deltas: readonly (number | undefined)[], count = 3): number[] {
  return deltas
    .flatMap((delta, index) => (delta !== undefined && delta > 0 ? [{ delta, index }] : []))
    .sort((a, b) => b.delta - a.delta)
    .slice(0, count)
    .map((d) => d.index)
}

export interface SimulationStats {
  /** Durchschnittliche Laufzeit je Abschnitt (s) */
  runAverageSec: number | undefined
  /** Laufzeit pro km (s), unabhängig von der Streckenlänge */
  runPacePerKmSec: number | undefined
  stationSec: number
  runSec: number
  /** Station mit der längsten Zeit (bei vollem Umfang) */
  slowestStation: { station: StationKey; sec: number } | undefined
}

/** Kennzahlen einer Simulation: Lauf vs. Stationen, langsamste Station. */
export function simulationStats(result: SimulationResult): SimulationStats {
  const segments = buildSegments(result.format, result.division)
  let runSec = 0
  let runMeters = 0
  let runs = 0
  let stationSec = 0
  let slowest: SimulationStats['slowestStation']
  result.splits.forEach((sec, i) => {
    const segment = segments[i]
    if (!segment) return
    if (segment.kind === 'run') {
      runSec += sec
      runMeters += segment.distanceM ?? 0
      runs += 1
    } else {
      stationSec += sec
      if (segment.station !== 'run' && (!slowest || sec > slowest.sec)) {
        slowest = { station: segment.station, sec }
      }
    }
  })
  return {
    runAverageSec: runs > 0 ? Math.round(runSec / runs) : undefined,
    runPacePerKmSec: runMeters > 0 ? Math.round((runSec / runMeters) * 1000) : undefined,
    stationSec,
    runSec,
    slowestStation: slowest,
  }
}

/** Beste Zeit je Abschnitt über mehrere Simulationen desselben Formats. */
export function bestSplits(results: readonly SimulationResult[]): (number | undefined)[] {
  const length = Math.max(0, ...results.map((r) => r.splits.length))
  return Array.from({ length }, (_, i) => {
    const values = results.flatMap((r) => (r.splits[i] === undefined ? [] : [r.splits[i]]))
    return values.length > 0 ? Math.min(...values) : undefined
  })
}
