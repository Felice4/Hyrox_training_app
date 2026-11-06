import { describe, expect, it } from 'vitest'
import { EXERCISE_LIBRARY, getLibraryExercise } from '@/data/exercises'
import { generatedWorkoutSchema } from '@/domain/generator/schema'
import { toSaveSessionPayload } from '@/domain/session/payload'
import { DIVISIONS, SIMULATION_FORMATS, STATIONS } from './formats'
import {
  bestSplits,
  biggestLosses,
  buildSegments,
  buildSimulationWorkout,
  createSimulation,
  cumulativeDelta,
  currentSegmentIndex,
  previousSimulation,
  raceElapsed,
  recordSplit,
  segmentElapsed,
  simulationStats,
  splitDeltas,
  splitTimes,
  startRace,
  toSimulationRecord,
  undoSplit,
  type SimulationResult,
} from './simulation'

const T0 = '2026-11-06T10:00:00.000Z'
const at = (sec: number) => new Date(Date.parse(T0) + sec * 1000).toISOString()
let counter = 0
const newId = () => `id-${++counter}`
const measurementOf = (slug: string) => getLibraryExercise(slug)?.measurement ?? 'reps'

describe('Formate und Abschnitte', () => {
  it('alle Stationen gibt es in der Bibliothek', () => {
    for (const spec of [...STATIONS.map((s) => s.exerciseSlug), 'hyrox-run']) {
      expect(
        EXERCISE_LIBRARY.some((e) => e.slug === spec),
        spec,
      ).toBe(true)
    }
  })

  it('Komplett: 16 Abschnitte im Wechsel Lauf/Station, Gewichte je Division', () => {
    const segments = buildSegments('full', 'open_men')
    expect(segments).toHaveLength(16)
    expect(segments.filter((s) => s.kind === 'run').every((s) => s.distanceM === 1000)).toBe(true)
    expect(segments[1]).toMatchObject({ station: 'skierg', distanceM: 1000 })
    expect(segments[3]).toMatchObject({ station: 'sled_push', weightKg: 152 })
    expect(segments[15]).toMatchObject({ station: 'wall_balls', reps: 100, weightKg: 6 })
    expect(buildSegments('full', 'pro_women')[15]?.weightKg).toBe(6)
  })

  it('Hälften und Kurzformat', () => {
    expect(buildSegments('half_1', 'open_men').map((s) => s.station)).toEqual([
      'run',
      'skierg',
      'run',
      'sled_push',
      'run',
      'sled_pull',
      'run',
      'burpee_broad_jump',
    ])
    expect(buildSegments('half_2', 'open_men')[1]?.station).toBe('row')
    const short = buildSegments('short', 'open_men')
    expect(short[0]?.distanceM).toBe(500)
    expect(short[15]?.reps).toBe(50)
  })

  it('das Workout ist gültig für alle Formate und Divisionen', () => {
    for (const format of SIMULATION_FORMATS) {
      for (const division of DIVISIONS) {
        const workout = buildSimulationWorkout(format, division)
        expect(generatedWorkoutSchema.safeParse(workout).success, `${format} ${division}`).toBe(
          true,
        )
      }
    }
  })
})

describe('Ablauf mit Rennuhr', () => {
  const create = () => createSimulation('half_1', 'open_men', T0, newId, measurementOf)

  it('Zwischenzeiten, Rückgängig und Ende nach dem letzten Abschnitt', () => {
    let session = create()
    // Vor dem Start passiert nichts
    expect(recordSplit(session, at(10))).toBe(session)
    session = startRace(session, at(60))
    expect(session.startedAt).toBe(at(60))
    expect(raceElapsed(session, at(120))).toBe(60)

    session = recordSplit(session, at(60 + 290)) // Lauf 1
    session = recordSplit(session, at(60 + 290 + 250)) // SkiErg
    expect(splitTimes(session)).toEqual([290, 250])
    expect(currentSegmentIndex(session)).toBe(2)
    expect(segmentElapsed(session, at(60 + 540 + 30))).toBe(30)

    // Fehltipp zurücknehmen: Lauf 2 läuft weiter ab dem Ende des SkiErg
    const tapped = recordSplit(session, at(700))
    session = undoSplit(tapped)
    expect(splitTimes(session)).toEqual([290, 250])
    expect(segmentElapsed(session, at(60 + 540 + 100))).toBe(100)

    for (const sec of [900, 1200, 1500, 1800, 2100, 2400]) session = recordSplit(session, at(sec))
    expect(session.finishedAt).toBe(at(2400))
    expect(currentSegmentIndex(session)).toBeUndefined()
    expect(raceElapsed(session, at(9999))).toBe(2340)

    const record = toSimulationRecord(session)
    expect(record).toMatchObject({ format: 'half_1', division: 'open_men', total_sec: 2340 })
    expect(record?.splits).toHaveLength(8)

    // Wird als normales Training gespeichert, Zeiten stehen an den Sätzen
    const payload = toSaveSessionPayload(session, { sessionRpe: 9, notes: undefined })
    expect(payload.session.focus).toBe('hyrox')
    expect(payload.exercises[0]?.sets[0]).toMatchObject({
      duration_sec: 290,
      distance_m: 1000,
      completed: true,
    })
    expect(payload.exercises[3]?.sets[0]?.weight_kg).toBe(152)

    // Nach dem Ende lässt sich der letzte Tipp noch zurücknehmen
    const reopened = undoSplit(session)
    expect(reopened.finishedAt).toBeUndefined()
    expect(splitTimes(reopened)).toHaveLength(7)
  })
})

describe('Vergleich und Auswertung', () => {
  const result = (sessionId: string, startedAt: string, splits: number[]): SimulationResult => ({
    sessionId,
    format: 'half_1',
    division: 'open_men',
    startedAt,
    totalSec: splits.reduce((a, b) => a + b, 0),
    splits,
  })

  it('findet die letzte Simulation desselben Formats', () => {
    const results = [
      result('a', '2026-10-01T10:00:00Z', [300]),
      result('b', '2026-10-20T10:00:00Z', [290]),
      { ...result('c', '2026-10-25T10:00:00Z', [280]), format: 'full' as const },
      result('d', '2026-11-06T10:00:00Z', [270]),
    ]
    expect(previousSimulation(results, 'half_1', '2026-11-06T10:00:00Z')?.sessionId).toBe('b')
    expect(previousSimulation(results, 'half_1', '2026-11-07T10:00:00Z', 'd')?.sessionId).toBe('b')
    expect(previousSimulation(results, 'short', '2026-11-07T10:00:00Z')).toBeUndefined()
  })

  it('Differenzen, Rückstand und größte Verluste', () => {
    const deltas = splitDeltas([300, 250, 310, 200], [290, 260, 280, 200])
    expect(deltas).toEqual([10, -10, 30, 0])
    expect(splitDeltas([300], undefined)).toEqual([undefined])
    expect(biggestLosses(deltas)).toEqual([2, 0])
    expect(cumulativeDelta([300, 250], [290, 260, 280])).toBe(0)
    expect(cumulativeDelta([300, 250], undefined)).toBeUndefined()
  })

  it('beste Zeit je Abschnitt', () => {
    expect(
      bestSplits([
        result('a', '2026-10-01T10:00:00Z', [300, 250]),
        result('b', '2026-10-02T10:00:00Z', [290, 260, 280]),
      ]),
    ).toEqual([290, 250, 280])
    expect(bestSplits([])).toEqual([])
  })

  it('Kennzahlen: Lauf vs. Stationen und langsamste Station', () => {
    const stats = simulationStats(
      result('a', '2026-11-06T10:00:00Z', [300, 250, 280, 180, 290, 200, 310, 240]),
    )
    expect(stats).toMatchObject({
      runSec: 1180,
      stationSec: 870,
      runAverageSec: 295,
      runPacePerKmSec: 295,
      slowestStation: { station: 'skierg', sec: 250 },
    })
  })
})
