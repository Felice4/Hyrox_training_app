import { describe, expect, it } from 'vitest'
import type { SessionDetail } from '@/api/sessionHistory'
import { toEntryPayload } from '@/domain/manualEntry/entry'
import { entryFromDetail } from './fromDetail'

const detail: SessionDetail = {
  id: 's1',
  startedAt: new Date(2026, 10, 10, 18, 5).toISOString(),
  endedAt: new Date(2026, 10, 10, 19, 5).toISOString(),
  focus: 'hyrox',
  intensity: 'hard',
  status: 'completed',
  durationMin: 60,
  rpe: 8,
  notes: 'stark',
  exerciseCount: 2,
  source: 'trainer',
  title: 'HYROX Class',
  coach: 'Max',
  plannedWorkoutId: 'p1',
  trainingLoad: 480,
  records: [],
  exercises: [
    {
      id: 'e1',
      slug: 'wall-balls',
      name: 'Wall Balls',
      block: 'main',
      status: 'completed',
      replacedName: undefined,
      sets: [
        {
          id: 'set1',
          setNumber: 1,
          type: 'working',
          target: {},
          actual: { reps: 30 },
          rpe: undefined,
          completed: true,
        },
      ],
    },
    {
      id: 'e2',
      slug: 'geloescht',
      name: 'Unbekannt',
      block: 'warmup',
      status: 'completed',
      replacedName: undefined,
      sets: [],
    },
  ],
}

const measurementOf = (slug: string) => (slug === 'wall-balls' ? ('reps' as const) : undefined)

describe('entryFromDetail', () => {
  it('übernimmt alle Angaben mit denselben IDs', () => {
    const entry = entryFromDetail(detail, measurementOf, () => 'neu')!
    expect(entry).toMatchObject({
      id: 's1',
      source: 'trainer',
      date: '2026-11-10',
      time: '18:05',
      durationMin: 60,
      focus: 'hyrox',
      title: 'HYROX Class',
      coach: 'Max',
      sessionRpe: 8,
      notes: 'stark',
      plannedWorkoutId: 'p1',
    })
    expect(entry.exercises).toEqual([
      {
        id: 'e1',
        exerciseSlug: 'wall-balls',
        exerciseName: 'Wall Balls',
        measurement: 'reps',
        block: 'main',
        sets: [{ id: 'set1', values: { reps: 30 } }],
      },
    ])
    // Erneutes Speichern: gleiche Session-, Übungs- und Satz-IDs
    const payload = toEntryPayload(entry)
    expect(payload.session).toMatchObject({ id: 's1', planned_workout_id: 'p1' })
    expect(payload.exercises[0]).toMatchObject({ id: 'e1' })
    expect(payload.exercises[0]!.sets[0]!.id).toBe('set1')
  })

  it('Trainings aus dem Trainingsmodus sind nicht bearbeitbar', () => {
    expect(entryFromDetail({ ...detail, source: 'app' }, measurementOf, () => 'x')).toBeNull()
  })
})
