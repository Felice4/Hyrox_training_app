import { describe, expect, it } from 'vitest'
import { toListItem, toSessionDetail } from './sessionHistory'

const base = {
  id: 's1',
  started_at: '2026-10-21T17:00:00+00:00',
  focus: 'strength',
  intensity: 'hard',
  status: 'partial',
  active_duration_sec: 2950,
  session_rpe: 8,
  notes: 'Knie ok',
}

const set = {
  set_number: 1,
  set_type: 'working',
  target_reps: 5,
  target_weight_kg: '100.00',
  target_distance_m: null,
  target_duration_sec: null,
  target_calories: null,
  reps: 5,
  weight_kg: '102.50',
  distance_m: null,
  duration_sec: null,
  calories: null,
  rpe: '8.5',
  completed: true,
}

describe('toListItem', () => {
  it('rundet die Dauer und übernimmt die Anzahl der Übungen', () => {
    expect(toListItem({ ...base, session_exercises: [{ count: 4 }] })).toEqual({
      id: 's1',
      startedAt: '2026-10-21T17:00:00+00:00',
      focus: 'strength',
      intensity: 'hard',
      status: 'partial',
      durationMin: 49,
      rpe: 8,
      notes: 'Knie ok',
      exerciseCount: 4,
    })
  })

  it('fängt unbekannte Werte ab', () => {
    const item = toListItem({ ...base, focus: 'yoga', session_rpe: null, session_exercises: [] })
    expect(item).toMatchObject({ focus: 'mixed', rpe: undefined, exerciseCount: 0 })
  })
})

describe('toSessionDetail', () => {
  it('sortiert Übungen und Sätze und wandelt Zahlen aus der Datenbank um', () => {
    const detail = toSessionDetail(
      {
        ...base,
        ended_at: '2026-10-21T18:00:00+00:00',
        training_load: 392,
        session_exercises: [
          {
            id: 'e2',
            position: 1,
            exercise_name: 'Klimmzug',
            block: 'accessory',
            status: 'skipped',
            exercise: { slug: 'pull-up' },
            replaced: { name: 'Latziehen' },
            session_sets: [],
          },
          {
            id: 'e1',
            position: 0,
            exercise_name: 'Kniebeuge',
            block: 'main',
            status: 'completed',
            exercise: { slug: 'back-squat' },
            replaced: null,
            session_sets: [{ ...set, set_number: 2 }, set],
          },
        ],
      },
      [],
    )
    expect(detail.exerciseCount).toBe(2)
    expect(detail.exercises.map((e) => e.name)).toEqual(['Kniebeuge', 'Klimmzug'])
    expect(detail.exercises[1]).toMatchObject({ status: 'skipped', replacedName: 'Latziehen' })
    expect(detail.exercises[0]?.sets.map((s) => s.setNumber)).toEqual([1, 2])
    expect(detail.exercises[0]?.sets[0]).toMatchObject({
      target: { reps: 5, weightKg: 100 },
      actual: { reps: 5, weightKg: 102.5 },
      rpe: 8.5,
      completed: true,
    })
  })
})
