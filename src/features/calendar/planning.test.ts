import { describe, expect, it } from 'vitest'
import type { CatalogExercise } from '@/api/exercises'
import type { ProfileDetails } from '@/api/profile'
import type { PlannedWorkout } from '@/api/weekPlans'
import { EQUIPMENT } from '@/data/exercises/vocabulary'
import { LIBRARY } from '@/domain/generator/testFixtures'
import type { Race } from '@/domain/race/race'
import {
  planWeek,
  raceWeekFor,
  regeneratePlanned,
  requestFor,
  weekTarget,
  type PlanningData,
} from './planning'

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
  title: null,
  coach: null,
  startTime: null,
  completedSessionId: null,
  raceSessionType: null,
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

// Wettkampf am 17.01.2027, Plan ab 16.11.2026; mögliche Tage Di, Do, Sa, So
const race: Race = {
  id: 'r1',
  name: 'HYROX Wien',
  raceDate: '2027-01-17',
  planStart: '2026-11-16',
  format: 'single',
  category: 'open',
  gender: 'men',
  daysPerWeek: 4,
  weekdays: [2, 4, 6, 7],
  targetTimeSec: null,
  status: 'active',
  resultTimeSec: null,
  resultSplits: null,
  resultSessionId: null,
}
// Mit allen Geräten, damit die Stationen (Sled, Wall Ball …) möglich sind
const raceData: PlanningData = {
  ...data,
  details: {
    ...details,
    profile: { ...details.profile, available_equipment: [...EQUIPMENT] },
  } as ProfileDetails,
  race,
}

describe('Wettkampfmodus', () => {
  it('plant Wochen im Plan mit den Einheiten der Phase', () => {
    const plan = planWeek(raceData, '2026-11-16', '2026-11-16', [], 1)
    expect(plan.days.map((d) => d.date)).toEqual([
      '2026-11-17',
      '2026-11-19',
      '2026-11-21',
      '2026-11-22',
    ])
    expect(plan.days.every((d) => d.raceSessionType !== undefined)).toBe(true)
    expect(weekTarget(raceData, '2026-11-16')).toBe(4)
    expect(raceWeekFor(raceData, '2026-11-16')?.phase).toBe('base')
  })

  it('plant Wochen außerhalb des Plans wie bisher', () => {
    const plan = planWeek(raceData, '2026-10-26', '2026-10-26', [], 1)
    expect(plan.days.every((d) => d.raceSessionType === undefined)).toBe(true)
    expect(weekTarget(raceData, '2026-10-26')).toBe(3)
  })

  it('erzeugt eine Wettkampf-Einheit als solche neu', () => {
    const next = regeneratePlanned(
      raceData,
      { date: '2026-12-16', raceSessionType: 'station_strength' },
      { durationMin: 60, focus: 'strength', intensity: 'hard' },
      '2026-11-16',
      1,
    )
    expect(next.raceSessionType).toBe('station_strength')
    const sled = next.workout.blocks
      .flatMap((b) => b.items)
      .find((i) => i.exerciseSlug === 'hyrox-sled-push')
    // Spezifisch: Wettkampfgewicht
    expect(sled?.sets[0]?.weightKg).toBe(152.5)
  })

  it('baut eine geplante Simulation wieder als Simulation', () => {
    const next = regeneratePlanned(
      raceData,
      { date: '2026-12-23', raceSessionType: 'simulation' },
      { durationMin: 60, focus: 'hyrox', intensity: 'hard' },
      '2026-11-16',
      1,
    )
    expect(next.raceSessionType).toBe('simulation')
    expect(next.workout.blocks[0]?.items).toHaveLength(16)
  })

  it('anderer Schwerpunkt oder kein Wettkampf → normales Workout', () => {
    const planned = { date: '2026-12-16', raceSessionType: 'station_strength' } as const
    const request = { durationMin: 45, focus: 'endurance', intensity: 'easy' } as const
    expect(regeneratePlanned(raceData, planned, request, '2026-11-16', 1).raceSessionType).toBe(
      null,
    )
    expect(
      regeneratePlanned(data, planned, { ...request, focus: 'strength' }, '2026-11-16', 1)
        .raceSessionType,
    ).toBe(null)
  })
})
