import { describe, expect, it } from 'vitest'
import { generateWorkout } from '@/domain/generator/generateWorkout'
import { makeInput } from '@/domain/generator/testFixtures'
import type { Tables } from '@/types/database'
import { toPlannedWorkout } from './weekPlans'

const row: Tables<'planned_workouts'> = {
  id: 'p1',
  user_id: 'u',
  week_plan_id: 'w1',
  scheduled_date: '2026-10-28',
  original_date: '2026-10-27',
  status: 'planned',
  focus: 'hyrox',
  target_duration_min: 60,
  intensity: 'hard',
  workout: null,
  explanation: [],
  source: 'week_plan',
  title: null,
  coach: null,
  start_time: null,
  race_session_type: null,
  completed_session_id: null,
  created_at: '',
  updated_at: '',
}

describe('toPlannedWorkout', () => {
  it('übernimmt die Felder einer geplanten Einheit', () => {
    expect(toPlannedWorkout(row)).toEqual({
      id: 'p1',
      weekPlanId: 'w1',
      date: '2026-10-28',
      originalDate: '2026-10-27',
      status: 'planned',
      focus: 'hyrox',
      intensity: 'hard',
      durationMin: 60,
      workout: null,
      source: 'week_plan',
      title: null,
      coach: null,
      startTime: null,
      completedSessionId: null,
      raceSessionType: null,
    })
  })

  it('übernimmt Trainer-Termine mit Uhrzeit ohne Sekunden', () => {
    expect(
      toPlannedWorkout({
        ...row,
        source: 'trainer',
        title: 'HYROX Class',
        coach: 'Max',
        start_time: '18:30:00',
      }),
    ).toMatchObject({ source: 'trainer', title: 'HYROX Class', coach: 'Max', startTime: '18:30' })
  })

  it('prüft das gespeicherte Workout und verwirft ungültige', () => {
    const workout = generateWorkout(makeInput())
    expect(toPlannedWorkout({ ...row, workout: workout as never }).workout).toEqual(workout)
    expect(toPlannedWorkout({ ...row, workout: { kaputt: true } }).workout).toBeNull()
  })

  it('setzt unbekannte Werte auf sichere Standards', () => {
    expect(
      toPlannedWorkout({ ...row, status: 'x', focus: 'yoga', intensity: 'max', source: 'import' }),
    ).toMatchObject({
      status: 'planned',
      focus: 'mixed',
      intensity: 'moderate',
      source: 'week_plan',
    })
  })

  it('übernimmt die Art der Wettkampf-Einheit und verwirft unbekannte', () => {
    expect(toPlannedWorkout(row).raceSessionType).toBeNull()
    expect(toPlannedWorkout({ ...row, race_session_type: 'compromised_run' }).raceSessionType).toBe(
      'compromised_run',
    )
    expect(toPlannedWorkout({ ...row, race_session_type: 'yoga' }).raceSessionType).toBeNull()
  })
})
