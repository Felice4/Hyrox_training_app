import { describe, expect, it } from 'vitest'
import { estimateOneRepMax, isBetter } from '@/domain/records/detect'
import { detectRecords } from '@/domain/records/detect'
import type { ActiveExercise, ActiveSession, ActiveSet } from './types'
import { toSaveSessionPayload } from './payload'

const T0 = '2026-10-21T17:00:00.000Z'
const T_END = '2026-10-21T18:00:00.000Z'

const set = (id: string, partial: Partial<ActiveSet>): ActiveSet => ({
  id,
  setNumber: 1,
  type: 'working',
  target: { restSec: 90 },
  actual: {},
  completed: true,
  completedAt: T0,
  ...partial,
})

const exercise = (
  partial: Partial<ActiveExercise> & Pick<ActiveExercise, 'exerciseSlug' | 'measurement' | 'sets'>,
): ActiveExercise => ({
  id: `ex-${partial.exerciseSlug}`,
  exerciseName: partial.exerciseSlug,
  role: 'strength_main',
  block: 'main',
  inCircuit: false,
  skipped: false,
  ...partial,
})

function session(exercises: ActiveExercise[]): ActiveSession {
  return {
    id: 'session-1',
    startedAt: T0,
    finishedAt: T_END,
    cursor: 0,
    pausedSec: 600,
    exercises,
    workout: {
      generatorVersion: 'rules-1.0.0',
      seed: 1,
      focus: 'strength',
      intensity: 'moderate',
      targetDurationMin: 60,
      estimatedDurationMin: 60,
      blocks: [],
      explanation: [],
      recoverySuggested: false,
    },
  }
}

const squat = exercise({
  exerciseSlug: 'back-squat',
  measurement: 'weight_reps',
  sets: [
    set('s0', { type: 'warmup', actual: { weightKg: 60, reps: 8 } }),
    set('s1', { actual: { weightKg: 100, reps: 5 }, rpe: 8 }),
    set('s2', { actual: { weightKg: 105, reps: 3 } }),
    set('s3', { actual: { weightKg: 110, reps: 5 }, completed: false, completedAt: undefined }),
  ],
})

describe('Rekord-Hilfen', () => {
  it('schätzt das 1RM nach Epley', () => {
    expect(estimateOneRepMax(100, 5)).toBe(116.5)
    expect(estimateOneRepMax(140, 1)).toBe(140)
  })

  it('vergleicht Zeiten umgekehrt', () => {
    expect(isBetter('best_time', 240, 250)).toBe(true)
    expect(isBetter('max_weight', 100, 105)).toBe(false)
  })
})

describe('detectRecords', () => {
  it('findet je Bedingung die beste Leistung – ohne Aufwärm- und offene Sätze', () => {
    const records = detectRecords(session([squat]))
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ recordType: 'max_weight', contextKey: 'reps=5', value: 100 }),
        expect.objectContaining({ recordType: 'max_weight', contextKey: 'reps=3', value: 105 }),
        expect.objectContaining({ recordType: 'estimated_1rm', contextKey: '', value: 116.5 }),
      ]),
    )
    expect(records.some((r) => r.value === 110 || r.value === 60)).toBe(false)
  })

  it('vergleicht Läufe nur über gleiche Strecken', () => {
    const run = exercise({
      exerciseSlug: 'hyrox-run',
      measurement: 'distance_time',
      role: 'run',
      sets: [
        set('r1', { actual: { distanceM: 1000, durationSec: 290 } }),
        set('r2', { actual: { distanceM: 1000, durationSec: 280 } }),
        set('r3', { actual: { distanceM: 400, durationSec: 100 } }),
        set('r4', { actual: { distanceM: 1000 } }),
      ],
    })
    const records = detectRecords(session([run]))
    expect(records).toHaveLength(2)
    expect(records.find((r) => r.contextKey === 'distance_m=1000')?.value).toBe(280)
    expect(records.find((r) => r.contextKey === 'distance_m=400')?.value).toBe(100)
  })

  it('erfasst Wiederholungen ohne Gewicht und Sled-Gewichte je Strecke', () => {
    const records = detectRecords(
      session([
        exercise({
          exerciseSlug: 'pull-up',
          measurement: 'reps',
          sets: [set('p1', { actual: { reps: 12 } })],
        }),
        exercise({
          exerciseSlug: 'hyrox-sled-push',
          measurement: 'weight_distance',
          sets: [set('sp', { actual: { weightKg: 152, distanceM: 25 } })],
        }),
      ]),
    )
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ exerciseSlug: 'pull-up', recordType: 'max_reps', value: 12 }),
        expect.objectContaining({
          exerciseSlug: 'hyrox-sled-push',
          contextKey: 'distance_m=25',
          value: 152,
        }),
      ]),
    )
  })
})

describe('detectRecords – Warm-up/Cool-down', () => {
  it('erzeugt keine Rekorde aus Warm-up und Cool-down', () => {
    const warmup = exercise({
      exerciseSlug: 'bodyweight-squat',
      measurement: 'reps',
      block: 'warmup',
      sets: [set('w1', { actual: { reps: 12 } })],
    })
    expect(detectRecords(session([warmup]))).toEqual([])
  })
})

describe('toSaveSessionPayload', () => {
  const s = session([
    squat,
    exercise({
      exerciseSlug: 'pull-up',
      measurement: 'reps',
      skipped: true,
      replacedSlug: 'chin-up',
      sets: [set('p1', { completed: false, completedAt: undefined })],
    }),
  ])

  it('überträgt Session, Übungen und Sätze', () => {
    const payload = toSaveSessionPayload(s, { sessionRpe: 7, notes: '  gut  ' })
    expect(payload.session).toMatchObject({
      id: 'session-1',
      active_duration_sec: 3000,
      status: 'partial',
      session_rpe: 7,
      notes: 'gut',
      training_load: 350,
      generator_version: 'rules-1.0.0',
    })
    expect(payload.exercises.map((e) => [e.exercise_slug, e.status, e.position])).toEqual([
      ['back-squat', 'partial', 0],
      ['pull-up', 'skipped', 1],
    ])
    expect(payload.exercises[1]?.replaced_exercise_slug).toBe('chin-up')
    expect(payload.exercises[0]?.sets[1]).toMatchObject({
      id: 's1',
      weight_kg: 100,
      reps: 5,
      rpe: 8,
      completed: true,
      target_reps: null,
    })
  })

  it('ist idempotent: gleiche Session → gleiche Nutzlast', () => {
    const a = toSaveSessionPayload(s, { sessionRpe: 7, notes: 'gut' })
    const b = toSaveSessionPayload(s, { sessionRpe: 7, notes: 'gut' })
    expect(a).toEqual(b)
  })

  it('speichert ohne Bewertung keine Belastung und keine leeren Notizen', () => {
    const payload = toSaveSessionPayload(s, { sessionRpe: undefined, notes: '   ' })
    expect(payload.session.session_rpe).toBeNull()
    expect(payload.session.training_load).toBe(0)
    expect(payload.session.notes).toBeNull()
  })

  it('gibt die geplante Einheit aus dem Wochenplan mit', () => {
    expect(toSaveSessionPayload(s, { sessionRpe: 7, notes: undefined }).session).toMatchObject({
      planned_workout_id: null,
    })
    const planned = toSaveSessionPayload(
      { ...s, plannedWorkoutId: 'plan-1' },
      { sessionRpe: 7, notes: undefined },
    )
    expect(planned.session.planned_workout_id).toBe('plan-1')
  })

  it('verlangt ein beendetes Training', () => {
    expect(() =>
      toSaveSessionPayload({ ...s, finishedAt: undefined }, { sessionRpe: 5, notes: undefined }),
    ).toThrow()
  })
})
