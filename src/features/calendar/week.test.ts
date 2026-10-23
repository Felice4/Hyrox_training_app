import { describe, expect, it } from 'vitest'
import type { PlannedWorkout } from '@/api/weekPlans'
import type { HistorySession } from '@/domain/generator/types'
import {
  addDays,
  calendarWeek,
  canPlanWeek,
  doneInWeek,
  keptForReplan,
  moveChange,
  moveTargets,
  nextPlanned,
  weekStartOf,
} from './week'

const planned = (partial: Partial<PlannedWorkout>): PlannedWorkout => ({
  id: 'p',
  weekPlanId: 'w',
  date: '2026-10-28',
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

// Lokale Mittagszeit → unabhängig von der Zeitzone der Testumgebung
const session = (date: string, focus: HistorySession['focus'] = 'hyrox'): HistorySession => ({
  startedAt: new Date(`${date}T12:00:00`).toISOString(),
  focus,
  durationMin: 60,
  exercises: [],
})

describe('Datumshilfen', () => {
  it('findet den Montag einer Woche, auch über Monatsgrenzen', () => {
    expect(weekStartOf('2026-10-23')).toBe('2026-10-19')
    expect(weekStartOf('2026-11-01')).toBe('2026-10-26')
    expect(weekStartOf('2026-10-26')).toBe('2026-10-26')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
  })

  it('erlaubt das Planen bis einschließlich Sonntag', () => {
    expect(canPlanWeek('2026-10-19', '2026-10-25')).toBe(true)
    expect(canPlanWeek('2026-10-19', '2026-10-26')).toBe(false)
  })
})

describe('Neuplanung', () => {
  it('zählt nur Trainings dieser Woche', () => {
    const done = doneInWeek(
      [session('2026-10-27', 'strength'), session('2026-10-25'), session('2026-11-02')],
      '2026-10-26',
    )
    expect(done).toEqual([{ date: '2026-10-27', focus: 'strength' }])
  })

  it('behält ausgefallene, vergangene und spontane Einheiten, nicht aber offene Planeinheiten', () => {
    const kept = keptForReplan(
      [
        planned({ id: 'a', date: '2026-10-26', status: 'skipped' }),
        planned({ id: 'b', date: '2026-10-27' }),
        planned({ id: 'c', date: '2026-10-29' }),
        planned({ id: 'd', date: '2026-10-30', source: 'manual', focus: 'endurance' }),
        planned({ id: 'e', date: '2026-10-28', status: 'completed' }),
      ],
      '2026-10-28',
    )
    expect(kept).toEqual([
      { date: '2026-10-26', focus: 'strength', status: 'skipped' },
      { date: '2026-10-27', focus: 'strength', status: 'planned' },
      { date: '2026-10-30', focus: 'endurance', status: 'planned' },
    ])
  })
})

describe('Wochenansicht', () => {
  it('ordnet Trainings und offene Einheiten den Tagen zu', () => {
    const days = calendarWeek(
      '2026-10-26',
      '2026-10-28',
      [session('2026-10-27')],
      [
        planned({ id: 'x', date: '2026-10-27', status: 'completed' }),
        planned({ id: 'y', date: '2026-10-29' }),
      ],
    )
    expect(days).toHaveLength(7)
    expect(days[1]).toMatchObject({ isPast: true, planned: [] })
    expect(days[1]?.sessions).toHaveLength(1)
    expect(days[2]?.isToday).toBe(true)
    expect(days[3]?.planned.map((p) => p.id)).toEqual(['y'])
  })

  it('findet die nächste offene Einheit ab heute', () => {
    const next = nextPlanned(
      [
        planned({ id: 'past', date: '2026-10-26' }),
        planned({ id: 'skip', date: '2026-10-28', status: 'skipped' }),
        planned({ id: 'later', date: '2026-10-30' }),
        planned({ id: 'today', date: '2026-10-28' }),
      ],
      '2026-10-28',
    )
    expect(next?.id).toBe('today')
  })
})

describe('Verschieben', () => {
  it('bietet nur Tage derselben Woche ab heute an', () => {
    expect(moveTargets(planned({ date: '2026-10-29' }), '2026-10-28')).toEqual([
      '2026-10-28',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ])
  })

  it('merkt sich das ursprüngliche Datum und hebt es beim Zurückschieben auf', () => {
    const p = planned({ date: '2026-10-29' })
    expect(moveChange(p, '2026-10-31')).toEqual({ date: '2026-10-31', originalDate: '2026-10-29' })
    const moved = planned({ date: '2026-10-31', originalDate: '2026-10-29' })
    expect(moveChange(moved, '2026-11-01')).toEqual({
      date: '2026-11-01',
      originalDate: '2026-10-29',
    })
    expect(moveChange(moved, '2026-10-29')).toEqual({ date: '2026-10-29', originalDate: null })
  })
})
