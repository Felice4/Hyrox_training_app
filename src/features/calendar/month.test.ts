import { describe, expect, it } from 'vitest'
import type { PlannedWorkout } from '@/api/weekPlans'
import type { HistorySession } from '@/domain/generator/types'
import { addMonths, monthEnd, monthWeeks, periodStats } from './month'
import { calendarDays } from './week'

const session = (date: string, durationMin = 60): HistorySession => ({
  startedAt: new Date(`${date}T12:00:00`).toISOString(),
  focus: 'strength',
  durationMin,
  exercises: [],
})

const planned = (date: string, status: PlannedWorkout['status'] = 'planned'): PlannedWorkout => ({
  id: date + status,
  weekPlanId: null,
  date,
  originalDate: null,
  status,
  focus: 'hyrox',
  intensity: 'hard',
  durationMin: 60,
  workout: null,
  source: 'week_plan',
  completedSessionId: null,
})

describe('Monatsraster', () => {
  it('rechnet Monate über den Jahreswechsel', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(monthEnd('2026-02')).toBe('2026-02-28')
    expect(monthEnd('2028-02')).toBe('2028-02-29')
  })

  it('deckt den Monat mit ganzen Wochen ab Montag ab', () => {
    const weeks = monthWeeks('2026-10')
    // 1.10.2026 ist ein Donnerstag, 31.10. ein Samstag
    expect(weeks).toHaveLength(5)
    expect(weeks[0]?.[0]).toBe('2026-09-28')
    expect(weeks[4]?.[6]).toBe('2026-11-01')
    expect(weeks.every((w) => w.length === 7)).toBe(true)
  })

  it('braucht für einen Februar, der am Montag beginnt, nur vier Wochen', () => {
    expect(monthWeeks('2027-02')).toHaveLength(4)
  })
})

describe('periodStats', () => {
  it('zählt Trainingstage, Minuten sowie offene, ausgefallene und verpasste Einheiten', () => {
    const days = calendarDays(
      ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06'],
      '2026-10-05',
      [session('2026-09-30'), session('2026-10-01', 45), session('2026-10-01', 30)],
      [
        planned('2026-10-02'),
        planned('2026-10-02', 'skipped'),
        planned('2026-10-05'),
        planned('2026-10-06'),
      ],
    )
    expect(periodStats(days, '2026-10')).toEqual({
      trainingDays: 1,
      sessions: 2,
      minutes: 75,
      open: 2,
      skipped: 1,
      missed: 1,
    })
    expect(periodStats(days).trainingDays).toBe(2)
  })
})
