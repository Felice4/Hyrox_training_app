import { describe, expect, it } from 'vitest'
import type { HistorySession } from '@/domain/generator/types'
import { frequency, periodBuckets, summarize, type PlannedEntry } from './frequency'

// Lokale Mittagszeit → unabhängig von der Zeitzone der Testumgebung
const session = (date: string, durationMin = 60): HistorySession => ({
  startedAt: new Date(`${date}T12:00:00`).toISOString(),
  focus: 'strength',
  durationMin,
  exercises: [],
})

const TODAY = '2026-10-23' // Freitag

describe('periodBuckets', () => {
  it('liefert Wochen ab Montag bis zur aktuellen Woche', () => {
    const weeks = periodBuckets('4w', TODAY)
    expect(weeks.map((w) => w.from)).toEqual([
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
    ])
    expect(weeks[3]?.to).toBe('2026-10-25')
    expect(periodBuckets('12w', TODAY)).toHaveLength(12)
  })

  it('liefert 12 Monate über den Jahreswechsel', () => {
    const months = periodBuckets('12m', TODAY)
    expect(months[0]).toEqual({ key: '2025-11', from: '2025-11-01', to: '2025-11-30' })
    expect(months[3]).toEqual({ key: '2026-02', from: '2026-02-01', to: '2026-02-28' })
    expect(months[11]).toEqual({ key: '2026-10', from: '2026-10-01', to: '2026-10-31' })
  })
})

describe('frequency', () => {
  const planned: PlannedEntry[] = [
    { date: '2026-10-13', status: 'completed' },
    { date: '2026-10-15', status: 'skipped' },
    { date: '2026-10-20', status: 'planned' }, // verpasst
    { date: '2026-10-22', status: 'completed' },
    { date: '2026-10-24', status: 'planned' }, // noch offen
  ]
  const sessions = [
    session('2026-10-13', 50),
    session('2026-10-22', 45),
    session('2026-10-22', 20),
    session('2026-09-01'),
  ]

  it('zählt Trainings, Minuten, Trainingstage und Geplantes je Woche', () => {
    const points = frequency(periodBuckets('4w', TODAY), sessions, planned)
    expect(points[2]).toMatchObject({ sessions: 1, minutes: 50, planned: 2, plannedDone: 1 })
    expect(points[3]).toMatchObject({
      sessions: 2,
      minutes: 65,
      trainingDays: 1,
      planned: 3,
      plannedDone: 1,
    })
  })

  it('fasst zusammen: Schnitt pro Woche und Planerfüllung ohne offene Einheiten', () => {
    const points = frequency(periodBuckets('4w', TODAY), sessions, planned)
    const summary = summarize(points, planned, TODAY)
    expect(summary).toMatchObject({ sessions: 3, minutes: 115, trainingDays: 2 })
    // 28.9. bis 23.10. = 26 Tage → 3 / 26 × 7
    expect(summary.perWeek).toBe(0.8)
    expect(summary.plannedDue).toBe(4)
    expect(summary.plannedDone).toBe(2)
    expect(summary.adherence).toBe(0.5)
  })

  it('meldet keine Planerfüllung ohne fällige Einheiten', () => {
    const points = frequency(periodBuckets('4w', TODAY), [], [])
    expect(summarize(points, [], TODAY)).toMatchObject({ sessions: 0, perWeek: 0, adherence: null })
  })
})
