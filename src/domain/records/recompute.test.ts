import { describe, expect, it } from 'vitest'
import type { Measurement } from '@/data/exercises/vocabulary'
import { bestRecordsAcross, type StoredSession } from './recompute'

const measurements: Record<string, Measurement> = {
  'back-squat': 'weight_reps',
  'wall-balls': 'reps',
}
const measurementOf = (slug: string) => measurements[slug]

function session(
  id: string,
  startedAt: string,
  exercises: StoredSession['exercises'],
): StoredSession {
  return { sessionId: id, startedAt, exercises }
}

const squat = (
  weightKg: number,
  reps: number,
  extra: Partial<StoredSession['exercises'][0]> = {},
) => ({
  exerciseSlug: 'back-squat',
  block: 'main' as const,
  sets: [{ setType: 'working' as const, completed: true, weightKg, reps }],
  ...extra,
})

describe('bestRecordsAcross', () => {
  it('nimmt den besten Wert über alle Trainings und merkt sich das Training', () => {
    const records = bestRecordsAcross(
      [
        session('s2', '2026-11-05T10:00:00Z', [squat(110, 5)]),
        session('s1', '2026-11-01T10:00:00Z', [squat(100, 5)]),
      ],
      ['back-squat'],
      measurementOf,
    )
    const max5 = records.find((r) => r.recordType === 'max_weight')
    expect(max5).toMatchObject({ value: 110, sessionId: 's2', contextKey: 'reps=5' })
  })

  it('bei Gleichstand zählt das frühere Training', () => {
    const records = bestRecordsAcross(
      [
        session('s2', '2026-11-05T10:00:00Z', [squat(100, 5)]),
        session('s1', '2026-11-01T10:00:00Z', [squat(100, 5)]),
      ],
      ['back-squat'],
      measurementOf,
    )
    expect(records.every((r) => r.sessionId === 's1')).toBe(true)
  })

  it('nur angefragte Übungen, ohne Warm-up und offene Sätze', () => {
    const records = bestRecordsAcross(
      [
        session('s1', '2026-11-01T10:00:00Z', [
          squat(200, 5, { block: 'warmup' }),
          {
            exerciseSlug: 'back-squat',
            block: 'main',
            sets: [{ setType: 'working', completed: false, weightKg: 150, reps: 5 }],
          },
          {
            exerciseSlug: 'wall-balls',
            block: 'main',
            sets: [{ setType: 'working', completed: true, reps: 50 }],
          },
        ]),
      ],
      ['back-squat'],
      measurementOf,
    )
    expect(records).toEqual([])
  })

  it('unbekannte Übung wird übersprungen', () => {
    const records = bestRecordsAcross(
      [session('s1', '2026-11-01T10:00:00Z', [{ ...squat(100, 5), exerciseSlug: 'gibts-nicht' }])],
      ['gibts-nicht'],
      measurementOf,
    )
    expect(records).toEqual([])
  })
})
