import { describe, expect, it } from 'vitest'
import { toHistorySessions, type HistoryRow } from './history'

const row: HistoryRow = {
  id: 'session-1',
  started_at: '2026-10-21T17:00:00+00:00',
  focus: 'strength',
  active_duration_sec: 3000,
  session_rpe: 7,
  session_exercises: [
    {
      position: 1,
      block: 'accessory',
      exercise: { slug: 'pull-up' },
      session_sets: [
        {
          set_number: 1,
          set_type: 'working',
          completed: true,
          reps: 8,
          weight_kg: null,
          distance_m: null,
          duration_sec: null,
          rpe: null,
          target_reps: 8,
        },
      ],
    },
    {
      position: 0,
      block: 'main',
      exercise: { slug: 'back-squat' },
      session_sets: [
        {
          set_number: 2,
          set_type: 'working',
          completed: true,
          reps: 5,
          weight_kg: 100,
          distance_m: null,
          duration_sec: null,
          rpe: 8,
          target_reps: 5,
        },
        {
          set_number: 1,
          set_type: 'warmup',
          completed: true,
          reps: 8,
          weight_kg: 50,
          distance_m: null,
          duration_sec: null,
          rpe: null,
          target_reps: 8,
        },
      ],
    },
    { position: 2, block: 'main', exercise: null, session_sets: [] },
  ],
}

describe('toHistorySessions', () => {
  it('wandelt Datenbankzeilen in den Verlauf um (sortiert, ohne leere Felder)', () => {
    const [session] = toHistorySessions([row])
    expect(session).toEqual({
      id: 'session-1',
      startedAt: '2026-10-21T17:00:00+00:00',
      focus: 'strength',
      durationMin: 50,
      sessionRpe: 7,
      exercises: [
        {
          exerciseSlug: 'back-squat',
          block: 'main',
          sets: [
            {
              setType: 'warmup',
              completed: true,
              reps: 8,
              weightKg: 50,
              distanceM: undefined,
              durationSec: undefined,
              rpe: undefined,
              targetReps: 8,
            },
            {
              setType: 'working',
              completed: true,
              reps: 5,
              weightKg: 100,
              distanceM: undefined,
              durationSec: undefined,
              rpe: 8,
              targetReps: 5,
            },
          ],
        },
        {
          exerciseSlug: 'pull-up',
          block: 'accessory',
          sets: [
            {
              setType: 'working',
              completed: true,
              reps: 8,
              weightKg: undefined,
              distanceM: undefined,
              durationSec: undefined,
              rpe: undefined,
              targetReps: 8,
            },
          ],
        },
      ],
    })
  })

  it('fängt unbekannte Werte ab', () => {
    const [session] = toHistorySessions([{ ...row, focus: 'yoga', session_rpe: null }])
    expect(session?.focus).toBe('mixed')
    expect(session?.sessionRpe).toBeUndefined()
  })
})
