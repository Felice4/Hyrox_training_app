import { describe, expect, it } from 'vitest'
import { LIBRARY, makeInput } from './testFixtures'
import { chooseDays, generateWeekPlan, type WeekPlanInput } from './weekPlan'

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
