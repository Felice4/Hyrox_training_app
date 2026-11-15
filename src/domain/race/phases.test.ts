import { describe, expect, it } from 'vitest'
import {
  adjustPlanStart,
  daysUntil,
  MAX_PLAN_WEEKS,
  planStartFor,
  raceTimeline,
  raceWeekOf,
} from './phases'

const phasesOf = (planStart: string, raceDate: string) =>
  raceTimeline({ planStart, raceDate }).map((w) => w.phase)

describe('planStartFor', () => {
  it('nimmt bis Donnerstag die laufende Woche', () => {
    expect(planStartFor('2026-11-16')).toBe('2026-11-16') // Montag
    expect(planStartFor('2026-11-19')).toBe('2026-11-16') // Donnerstag
  })

  it('nimmt ab Freitag die nächste Woche', () => {
    expect(planStartFor('2026-11-20')).toBe('2026-11-23') // Freitag
    expect(planStartFor('2026-11-15')).toBe('2026-11-16') // Sonntag
  })
})

describe('adjustPlanStart', () => {
  it('behält den Planstart und rückt ihn nur vor einen früheren Wettkampf', () => {
    expect(adjustPlanStart('2026-11-16', '2027-02-01')).toBe('2026-11-16')
    expect(adjustPlanStart('2026-11-23', '2026-11-22')).toBe('2026-11-16')
  })
})

describe('raceTimeline', () => {
  it('teilt 9 Wochen in Aufbau, Entlastung, Spezifisch, Tapering und Wettkampfwoche', () => {
    const timeline = raceTimeline({ planStart: '2026-11-16', raceDate: '2027-01-17' })
    expect(timeline.map((w) => w.phase)).toEqual([
      'base',
      'base',
      'base',
      'deload',
      'build',
      'build',
      'build',
      'taper',
      'race',
      'recovery',
    ])
    expect(timeline[0]).toEqual({ weekStart: '2026-11-16', phase: 'base', number: 1, total: 9 })
    expect(timeline[8]).toMatchObject({ weekStart: '2027-01-11', number: 9 })
    expect(timeline[9]).toEqual({
      weekStart: '2027-01-18',
      phase: 'recovery',
      number: null,
      total: 9,
    })
  })

  it('verzichtet bei sehr kurzer Vorbereitung auf Aufbau und Entlastung', () => {
    expect(phasesOf('2026-11-16', '2026-11-29')).toEqual(['build', 'race', 'recovery'])
    expect(phasesOf('2026-11-16', '2026-12-06')).toEqual(['build', 'taper', 'race', 'recovery'])
    expect(phasesOf('2026-11-16', '2026-12-13')).toEqual([
      'build',
      'build',
      'taper',
      'race',
      'recovery',
    ])
  })

  it('hat bei 5 Wochen mindestens so viel Spezifisch wie Aufbau', () => {
    expect(phasesOf('2026-11-16', '2026-12-20')).toEqual([
      'base',
      'build',
      'build',
      'taper',
      'race',
      'recovery',
    ])
  })

  it('plant ab 12 Wochen zwei Taper-Wochen und keine Entlastung direkt davor', () => {
    const phases = phasesOf('2026-11-16', '2027-02-07') // 12 Wochen
    expect(phases.slice(-4)).toEqual(['taper', 'taper', 'race', 'recovery'])
    expect(phases[phases.length - 5]).not.toBe('deload')
    expect(phases.filter((p) => p === 'deload')).toHaveLength(2)
  })

  it('beginnt höchstens 16 Wochen vor dem Wettkampf', () => {
    const timeline = raceTimeline({ planStart: '2026-11-16', raceDate: '2027-06-20' })
    expect(timeline).toHaveLength(MAX_PLAN_WEEKS + 1)
    expect(timeline[0]).toMatchObject({ weekStart: '2027-03-01', number: 1, total: 16 })
    expect(timeline.at(-2)).toMatchObject({ weekStart: '2027-06-14', phase: 'race' })
  })

  it('hat bei einem Wettkampf in der Startwoche nur die Wettkampfwoche', () => {
    expect(phasesOf('2026-11-16', '2026-11-22')).toEqual(['race', 'recovery'])
  })
})

describe('raceWeekOf', () => {
  const timeline = raceTimeline({ planStart: '2026-11-16', raceDate: '2027-01-17' })

  it('findet die Woche zu einem beliebigen Tag', () => {
    expect(raceWeekOf(timeline, '2026-12-10')).toMatchObject({ phase: 'deload', number: 4 })
    expect(raceWeekOf(timeline, '2027-01-17')).toMatchObject({ phase: 'race' })
    expect(raceWeekOf(timeline, '2027-01-20')).toMatchObject({ phase: 'recovery' })
  })

  it('liefert außerhalb des Plans nichts', () => {
    expect(raceWeekOf(timeline, '2026-11-15')).toBeUndefined()
    expect(raceWeekOf(timeline, '2027-01-25')).toBeUndefined()
  })
})

describe('daysUntil', () => {
  it('zählt ganze Tage, auch über die Zeitumstellung', () => {
    expect(daysUntil('2027-01-17', '2026-11-15')).toBe(63)
    expect(daysUntil('2026-11-15', '2026-11-15')).toBe(0)
    expect(daysUntil('2026-11-14', '2026-11-15')).toBe(-1)
    expect(daysUntil('2027-04-01', '2027-03-20')).toBe(12)
  })
})
