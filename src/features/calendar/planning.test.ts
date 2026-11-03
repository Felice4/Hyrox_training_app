import { describe, expect, it } from 'vitest'
import type { CatalogExercise } from '@/api/exercises'
import type { ProfileDetails } from '@/api/profile'
import type { PlannedWorkout } from '@/api/weekPlans'
import { LIBRARY } from '@/domain/generator/testFixtures'
import { planWeek, requestFor, type PlanningData } from './planning'

const exercises = LIBRARY.map((e, i) => ({
  ...e,
  id: `ex-${i}`,
  source: 'library',
  isArchived: false,
})) as CatalogExercise[]

const details = {
  profile: {
    training_days_per_week: 3,
    preferred_weekdays: [2, 4, 6],
    default_duration_min: 45,
    training_level: 'intermediate',
    available_equipment: [],
    limitation_regions: [],
  },
  goals: null,
  latestWeight: null,
  latestBodyFat: null,
  records: [],
  preferredExercises: [],
  dislikedExercises: [],
} as unknown as ProfileDetails

const data: PlanningData = { details, exercises, history: [] }

const planned = (partial: Partial<PlannedWorkout>): PlannedWorkout => ({
  id: 'p',
  weekPlanId: 'w',
  date: '2026-10-27',
  originalDate: null,
  status: 'planned',
  focus: 'strength',
  intensity: 'hard',
  durationMin: 60,
  workout: null,
  source: 'week_plan',
  completedSessionId: null,
  ...partial,
})

describe('planWeek', () => {
  it('übernimmt Trainingstage, bevorzugte Wochentage und Standarddauer aus dem Profil', () => {
    const plan = planWeek(data, '2026-10-26', '2026-10-26', [], 1)
    expect(plan.days.map((d) => d.date)).toEqual(['2026-10-27', '2026-10-29', '2026-10-31'])
    expect(plan.days.every((d) => d.durationMin === 45)).toBe(true)
  })

  it('lässt Tage mit ausgefallenen oder spontanen Einheiten frei', () => {
    const plan = planWeek(
      data,
      '2026-10-26',
      '2026-10-26',
      [
        planned({ id: 'a', date: '2026-10-27', status: 'skipped' }),
        planned({ id: 'b', date: '2026-10-29', source: 'manual' }),
      ],
      1,
    )
    const dates = plan.days.map((d) => d.date)
    expect(dates).not.toContain('2026-10-27')
    expect(dates).not.toContain('2026-10-29')
    expect(dates).toHaveLength(3)
  })
})

describe('requestFor', () => {
  it('behält Schwerpunkt, Dauer und Intensität und nutzt ohne Check-in „normal"', () => {
    expect(requestFor(planned({ focus: 'hyrox', durationMin: 75, intensity: 'moderate' }))).toEqual(
      {
        durationMin: 75,
        focus: 'hyrox',
        intensity: 'moderate',
        readiness: { kind: 'quick', level: 'normal' },
      },
    )
  })

  it('übernimmt den Check-in von heute', () => {
    const readiness = {
      kind: 'checkin',
      energy: 2,
      soreness: 2,
      sleepQuality: 2,
      recovery: 2,
    } as const
    expect(requestFor(planned({}), readiness).readiness).toEqual(readiness)
  })
})
