import { describe, expect, it } from 'vitest'
import { EXERCISE_LIBRARY } from '@/data/exercises'
import { getMilestone } from '@/data/skills'
import {
  draftFromMetric,
  emptyDraft,
  exercisesForKind,
  formatTargetInput,
  parseTargetInput,
  validateDraft,
} from './milestoneForm'

const known = new Set(EXERCISE_LIBRARY.map((e) => e.slug))

describe('Formular für eigene Meilensteine', () => {
  it('erstellt Wiederholungen am Stück', () => {
    const result = validateDraft(
      {
        ...emptyDraft(),
        name: ' 100 Wall Balls am Stück ',
        exercise: 'hyrox-wall-balls',
        target: '100',
      },
      known,
    )
    expect(result).toEqual({
      ok: true,
      name: '100 Wall Balls am Stück',
      area: 'other',
      metric: { kind: 'max_reps', exercises: ['hyrox-wall-balls'], reps: 100 },
    })
  })

  it('erstellt Zeit über eine Strecke und Gewichte mit Komma', () => {
    const time = validateDraft(
      {
        ...emptyDraft(),
        name: '2 km Rudern',
        kind: 'best_time',
        exercise: 'row-steady',
        distanceM: '2000',
        target: '7:15',
      },
      known,
    )
    expect(time.ok && time.metric).toEqual({
      kind: 'best_time',
      exercises: ['row-steady'],
      distanceM: 2000,
      maxSec: 435,
    })
    const factor = validateDraft(
      {
        ...emptyDraft(),
        name: 'Front Squat 1,25 × KG',
        kind: 'relative_strength',
        exercise: 'front-squat',
        target: '1,25',
      },
      known,
    )
    expect(factor.ok && factor.metric).toEqual({
      kind: 'relative_strength',
      exercise: 'front-squat',
      factor: 1.25,
    })
  })

  it('meldet fehlende oder ungültige Angaben', () => {
    const result = validateDraft(
      {
        ...emptyDraft(),
        name: 'x',
        kind: 'best_time',
        exercise: 'gibt-es-nicht',
        distanceM: 'abc',
        target: '90 min',
      },
      known,
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(Object.keys(result.errors).sort()).toEqual(['distanceM', 'exercise', 'name', 'target'])
  })

  it('prüft Zielwerte je Art', () => {
    expect(parseTargetInput('max_reps', '12')).toBe(12)
    expect(parseTargetInput('max_reps', '12,5')).toBeNull()
    expect(parseTargetInput('max_weight', '142,5')).toBe(142.5)
    expect(parseTargetInput('relative_strength', '8')).toBeNull()
    expect(parseTargetInput('hyrox_time', '1:15:00')).toBe(4500)
    expect(parseTargetInput('best_time', '0')).toBeNull()
  })

  it('befüllt das Formular aus einer Messung und zeigt Zielwerte wie eingegeben', () => {
    const draft = draftFromMetric('5 km', 'run', getMilestone('run-5k-sub-22')!.metric)
    expect(draft).toMatchObject({ kind: 'best_time', distanceM: '5000', target: '22:00' })
    expect(formatTargetInput(getMilestone('deadlift-2-5x-bodyweight')!.metric)).toBe('2,5')
  })

  it('bietet nur passende Übungen an', () => {
    const times = exercisesForKind(EXERCISE_LIBRARY, 'best_time')
    expect(times.every((e) => e.measurement === 'distance_time')).toBe(true)
    expect(exercisesForKind(EXERCISE_LIBRARY, 'max_weight').map((e) => e.slug)).toContain(
      'deadlift',
    )
  })
})
