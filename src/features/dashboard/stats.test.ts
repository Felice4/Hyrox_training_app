import { describe, expect, it } from 'vitest'
import type { HistorySession } from '@/domain/generator/types'
import {
  isoWeekday,
  loadStatus,
  nextPreferredDay,
  startOfWeek,
  weekStats,
  weekStrip,
} from './stats'

// Donnerstag, 22.10.2026, 18:00 Uhr (lokal)
const NOW = new Date(2026, 9, 22, 18, 0)

function session(day: number, hour = 17, durationMin = 60): HistorySession {
  return {
    startedAt: new Date(2026, 9, day, hour, 0).toISOString(),
    focus: 'strength',
    durationMin,
    exercises: [],
  }
}

describe('Wochenrechnung', () => {
  it('kennt Wochentage und den Wochenbeginn (Montag)', () => {
    expect(isoWeekday(NOW)).toBe(4)
    expect(isoWeekday(new Date(2026, 9, 25))).toBe(7)
    expect(startOfWeek(NOW)).toEqual(new Date(2026, 9, 19))
    expect(startOfWeek(new Date(2026, 9, 25, 23, 0))).toEqual(new Date(2026, 9, 19))
  })

  it('zählt nur Trainings dieser Woche', () => {
    const history = [session(18), session(19, 7, 45), session(21, 18, 55.6), session(22, 9)]
    expect(weekStats(history, NOW)).toEqual({ sessions: 3, minutes: 161 })
  })
})

describe('weekStrip', () => {
  it('markiert trainierte, bevorzugte und heutige Tage', () => {
    const strip = weekStrip([session(20), session(22, 8)], [2, 4, 6], NOW)
    expect(strip).toHaveLength(7)
    expect(strip.map((d) => d.trained)).toEqual([false, true, false, true, false, false, false])
    expect(strip.map((d) => d.preferred)).toEqual([false, true, false, true, false, true, false])
    expect(strip.findIndex((d) => d.isToday)).toBe(3)
    expect(strip.filter((d) => d.isPast)).toHaveLength(3)
  })
})

describe('nextPreferredDay', () => {
  it('nimmt heute, wenn heute ein Trainingstag ist und noch nicht trainiert wurde', () => {
    expect(nextPreferredDay([], [4, 6], NOW)).toEqual(new Date(2026, 9, 22))
  })

  it('springt zum nächsten Tag, wenn heute schon trainiert wurde', () => {
    expect(nextPreferredDay([session(22, 8)], [4, 6], NOW)).toEqual(new Date(2026, 9, 24))
  })

  it('geht über das Wochenende hinaus', () => {
    expect(nextPreferredDay([], [1], NOW)).toEqual(new Date(2026, 9, 26))
  })

  it('liefert nichts ohne bevorzugte Tage', () => {
    expect(nextPreferredDay([], [], NOW)).toBeUndefined()
  })
})

describe('loadStatus', () => {
  it('ordnet die Belastung ein', () => {
    expect(loadStatus({ acute: 0, chronicWeekly: 0, ratio: null, elevated: false }).level).toBe(
      'unknown',
    )
    expect(loadStatus({ acute: 500, chronicWeekly: 1000, ratio: 0.5, elevated: false }).level).toBe(
      'low',
    )
    expect(loadStatus({ acute: 1000, chronicWeekly: 1000, ratio: 1, elevated: false }).level).toBe(
      'normal',
    )
    expect(loadStatus({ acute: 1500, chronicWeekly: 1000, ratio: 1.5, elevated: true }).level).toBe(
      'high',
    )
  })
})
