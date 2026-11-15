import { describe, expect, it } from 'vitest'
import { LIBRARY, makeInput } from './testFixtures'
import {
  chooseDays,
  generateWeekPlan,
  type RaceSessionPlanInput,
  type RaceWeekInput,
  type WeekPlanInput,
} from './weekPlan'

// Woche ab Montag, 26.10.2026
const MONDAY = '2026-10-26'

function input(partial: Partial<WeekPlanInput> = {}): WeekPlanInput {
  const base = makeInput()
  return {
    weekStart: MONDAY,
    today: MONDAY,
    trainingDaysPerWeek: 4,
    preferredWeekdays: [],
    durationMin: 60,
    profile: base.profile,
    goals: base.goals,
    exercises: LIBRARY,
    history: [],
    done: [],
    kept: [],
    seed: 1,
    ...partial,
  }
}

const LEG_HEAVY = ['strength', 'hyrox', 'mixed', 'full_body']
const dayDiff = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000

describe('chooseDays', () => {
  it('nimmt zuerst bevorzugte Wochentage', () => {
    const free = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']
    expect(chooseDays(free, 2, [2, 4], [])).toEqual(['2026-10-27', '2026-10-29'])
  })

  it('verteilt ohne Vorgaben gleichmäßig über die Woche', () => {
    const free = Array.from({ length: 7 }, (_, i) =>
      `2026-10-${26 + i}`.replace('-10-32', '-11-01'),
    )
    expect(chooseDays(free, 3, [], [])).toEqual(['2026-10-26', '2026-10-29', '2026-11-01'])
  })
})

describe('generateWeekPlan', () => {
  it('plant so viele Einheiten wie Trainingstage, auf bevorzugten Tagen', () => {
    const plan = generateWeekPlan(input({ preferredWeekdays: [1, 3, 5, 6] }))
    expect(plan.days.map((d) => d.date)).toEqual([
      '2026-10-26',
      '2026-10-28',
      '2026-10-30',
      '2026-10-31',
    ])
    expect(new Set(plan.days.map((d) => d.focus))).toEqual(
      new Set(['strength', 'endurance', 'full_body', 'hyrox']),
    )
  })

  it('legt beinlastige Einheiten nicht an Folgetage, wenn es vermeidbar ist', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const plan = generateWeekPlan(input({ preferredWeekdays: [1, 3, 5, 6], seed }))
      const fri = plan.days.find((d) => d.date === '2026-10-30')
      const sat = plan.days.find((d) => d.date === '2026-10-31')
      expect(LEG_HEAVY.includes(fri!.focus) && LEG_HEAVY.includes(sat!.focus)).toBe(false)
    }
  })

  it('erzeugt für jeden Tag ein Workout mit passender Dauer und Intensität', () => {
    const plan = generateWeekPlan(input({ trainingDaysPerWeek: 5 }))
    expect(plan.days).toHaveLength(5)
    for (const day of plan.days) {
      expect(day.workout.focus).toBe(day.focus)
      expect(Math.abs(day.workout.estimatedDurationMin - 60)).toBeLessThanOrEqual(6)
      if (day.focus === 'recovery') expect(day.intensity).toBe('easy')
    }
    const hardDays = plan.days.filter((d) => d.intensity === 'hard').length
    expect(hardDays).toBeGreaterThan(0)
    expect(hardDays).toBeLessThan(5)
  })

  it('plant mitten in der Woche nur ab heute und zählt Absolviertes mit', () => {
    const plan = generateWeekPlan(
      input({
        today: '2026-10-29',
        done: [
          { date: '2026-10-26', focus: 'strength' },
          { date: '2026-10-27', focus: 'hyrox' },
        ],
      }),
    )
    expect(plan.days).toHaveLength(2)
    expect(plan.days.every((d) => d.date >= '2026-10-29')).toBe(true)
    expect(plan.days.map((d) => d.focus).sort()).toEqual(['endurance', 'full_body'])
    expect(plan.explanation[0]).toContain('2 von 4')
  })

  it('plant nichts, wenn das Wochenziel schon erreicht ist', () => {
    const done = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'].map((date) => ({
      date,
      focus: 'mixed' as const,
    }))
    expect(generateWeekPlan(input({ today: '2026-10-30', done })).days).toEqual([])
  })

  it('belegt Tage mit ausgefallenen Einheiten nicht neu', () => {
    const plan = generateWeekPlan(
      input({
        preferredWeekdays: [2, 4],
        trainingDaysPerWeek: 2,
        kept: [{ date: '2026-10-27', focus: 'hyrox', status: 'skipped' }],
      }),
    )
    expect(plan.days.map((d) => d.date)).not.toContain('2026-10-27')
  })

  it('lässt Schwerpunkte mit Zielgewichtung 0 weg', () => {
    const plan = generateWeekPlan(
      input({ goals: { hypertrophy: 30, strength: 40, endurance: 30, hyrox: 0 } }),
    )
    expect(plan.days.some((d) => d.focus === 'hyrox')).toBe(false)
  })

  it('ist deterministisch', () => {
    expect(generateWeekPlan(input({ seed: 42 }))).toEqual(generateWeekPlan(input({ seed: 42 })))
  })

  it('meldet, wenn nicht mehr genug freie Tage übrig sind', () => {
    const plan = generateWeekPlan(input({ today: '2026-10-31', trainingDaysPerWeek: 4 }))
    expect(plan.days).toHaveLength(2)
    expect(plan.explanation.join(' ')).toContain('nur noch 2 freie Tage')
    expect(dayDiff(plan.days[0]!.date, plan.days[1]!.date)).toBe(1)
  })
})

describe('generateWeekPlan im Wettkampfmodus', () => {
  const weights = { sled_push: 152, sled_pull: 103, wall_balls: 6 }
  const session = (
    type: RaceSessionPlanInput['type'],
    focus: RaceSessionPlanInput['focus'],
    intensity: RaceSessionPlanInput['intensity'],
  ): RaceSessionPlanInput => ({
    type,
    focus,
    intensity,
    durationMin: 45,
    raceSession:
      type === 'simulation'
        ? undefined
        : { type, team: 'single', stationWeights: weights, loadShare: 0.8 },
  })
  // Aufbau mit 4 Tagen, wichtigste Einheit zuerst
  const race: RaceWeekInput = {
    sessions: [
      session('compromised_run', 'hyrox', 'moderate'),
      session('station_strength', 'strength', 'moderate'),
      session('run_intervals', 'endurance', 'moderate'),
      session('easy_run', 'endurance', 'easy'),
    ],
    // Montag und Mittwoch gesperrt
    weekdays: [2, 4, 6, 7],
    explanation: ['Wettkampfmodus · Aufbau · Woche 1 von 9.'],
  }

  it('plant die Einheiten nur auf die möglichen Wochentage', () => {
    const plan = generateWeekPlan(input({ race, trainingDaysPerWeek: 2 }))
    expect(plan.days.map((d) => d.date)).toEqual([
      '2026-10-27',
      '2026-10-29',
      '2026-10-31',
      '2026-11-01',
    ])
    expect(plan.days.map((d) => d.raceSessionType).sort()).toEqual([
      'compromised_run',
      'easy_run',
      'run_intervals',
      'station_strength',
    ])
    expect(plan.explanation[0]).toBe('Wettkampfmodus · Aufbau · Woche 1 von 9.')
  })

  it('legt keine beinlastigen Einheiten an Folgetage', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const plan = generateWeekPlan(input({ race, seed }))
      for (let i = 1; i < plan.days.length; i++) {
        const [a, b] = [plan.days[i - 1]!, plan.days[i]!]
        if (dayDiff(a.date, b.date) === 1) {
          expect(LEG_HEAVY.includes(a.focus) && LEG_HEAVY.includes(b.focus)).toBe(false)
        }
      }
    }
  })

  it('erzeugt Wettkampf-Workouts mit Zielgewichten', () => {
    const plan = generateWeekPlan(input({ race }))
    const strength = plan.days.find((d) => d.raceSessionType === 'station_strength')
    const sled = strength?.workout.blocks
      .flatMap((b) => b.items)
      .find((i) => i.exerciseSlug === 'hyrox-sled-push')
    expect(sled?.sets[0]?.weightKg).toBe(122.5)
  })

  it('ein Trainer-Termin (HYROX) ersetzt den Kompromiss-Lauf', () => {
    const plan = generateWeekPlan(
      input({ race, kept: [{ date: '2026-10-29', focus: 'hyrox', status: 'planned' }] }),
    )
    expect(plan.days.map((d) => d.raceSessionType)).not.toContain('compromised_run')
    expect(plan.days.map((d) => d.date)).not.toContain('2026-10-29')
    expect(plan.days).toHaveLength(3)
  })

  it('zählt Erledigtes mit und lässt bei zu wenig Tagen die unwichtigsten weg', () => {
    const plan = generateWeekPlan(
      input({
        race,
        today: '2026-10-30',
        done: [{ date: '2026-10-27', focus: 'strength' }],
      }),
    )
    // Frei: Sa, So → Kompromiss-Lauf und Laufintervalle; der Dauerlauf entfällt
    expect(plan.days.map((d) => d.raceSessionType).sort()).toEqual([
      'compromised_run',
      'run_intervals',
    ])
    expect(plan.explanation.join(' ')).toContain('1 Einheit(en) mit geringerer Priorität')
  })

  it('plant nicht nach dem spätesten Tag (Wettkampfwoche)', () => {
    const plan = generateWeekPlan(
      input({
        race: {
          ...race,
          sessions: [
            session('activation', 'recovery', 'easy'),
            session('activation', 'recovery', 'easy'),
          ],
          latestDate: '2026-10-30',
        },
      }),
    )
    expect(plan.days.map((d) => d.date)).toEqual(['2026-10-27', '2026-10-29'])
  })

  it('übernimmt fertige Workouts (Simulation) unverändert', () => {
    const simulation = generateWeekPlan(input()).days[0]!.workout
    const plan = generateWeekPlan(
      input({
        race: {
          ...race,
          sessions: [{ ...session('simulation', 'hyrox', 'hard'), workout: simulation }],
        },
      }),
    )
    expect(plan.days[0]?.workout).toBe(simulation)
    expect(plan.days[0]?.raceSessionType).toBe('simulation')
  })
})
